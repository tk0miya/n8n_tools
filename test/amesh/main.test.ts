import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RunOutput } from "#amesh/main.js";
import {
  buildMapUrl,
  buildMaskUrl,
  buildMeshUrl,
  computeMeshTimestamp,
  computeMeshTimestamps,
  fetchImage,
  parseArgs,
  run,
} from "#amesh/main.js";

// ── computeMeshTimestamp ─────────────────────────────────────

describe("computeMeshTimestamp", () => {
  it("subtracts one unit (5 minutes) and floors to the nearest 5-minute mark (JST)", () => {
    // 2026-04-11 12:07:30 UTC == 2026-04-11 21:07:30 JST
    // minus 5 minutes -> 21:02:30 JST -> floored to 21:00
    expect(computeMeshTimestamp(new Date("2026-04-11T12:07:30.000Z"))).toBe("202604112100");
  });

  it("rounds down within the same 5-minute bucket after subtraction", () => {
    // 2026-04-11 12:12:00 UTC == 21:12:00 JST -> minus 5min -> 21:07:00 -> floor -> 21:05
    expect(computeMeshTimestamp(new Date("2026-04-11T12:12:00.000Z"))).toBe("202604112105");
  });

  it("handles crossing an hour boundary", () => {
    // 2026-04-11 12:02:00 UTC == 21:02:00 JST -> minus 5min -> 20:57:00 -> floor -> 20:55
    expect(computeMeshTimestamp(new Date("2026-04-11T12:02:00.000Z"))).toBe("202604112055");
  });

  it("handles crossing midnight (JST date changes)", () => {
    // 2026-04-11 15:02:00 UTC == 2026-04-12 00:02:00 JST -> minus 5min -> 2026-04-11 23:57:00 -> floor -> 23:55
    expect(computeMeshTimestamp(new Date("2026-04-11T15:02:00.000Z"))).toBe("202604112355");
  });
});

describe("computeMeshTimestamps", () => {
  it("returns `count` timestamps, 5 minutes apart, oldest first, ending at computeMeshTimestamp(now)", () => {
    const now = new Date("2026-04-11T12:07:30.000Z");
    const timestamps = computeMeshTimestamps(now, 3);
    expect(timestamps).toEqual(["202604112050", "202604112055", "202604112100"]);
    expect(timestamps[timestamps.length - 1]).toBe(computeMeshTimestamp(now));
  });

  it("handles crossing midnight across the whole range", () => {
    // latest frame is 2026-04-11 23:55 JST; 3 frames span 23:45-23:55
    const now = new Date("2026-04-11T15:02:00.000Z");
    expect(computeMeshTimestamps(now, 3)).toEqual(["202604112345", "202604112350", "202604112355"]);
  });
});

// ── URL builders ─────────────────────────────────────────────

describe("buildMapUrl", () => {
  it("returns the base map URL", () => {
    expect(buildMapUrl()).toBe("https://tokyo-ame.jwa.or.jp/map/map000.jpg");
  });
});

describe("buildMaskUrl", () => {
  it("returns the prefecture-border/name overlay URL", () => {
    expect(buildMaskUrl()).toBe("https://tokyo-ame.jwa.or.jp/map/msk000.png");
  });
});

describe("buildMeshUrl", () => {
  it("embeds the timestamp into the rainfall mesh URL", () => {
    expect(buildMeshUrl("202604112100")).toBe("https://tokyo-ame.jwa.or.jp/mesh/000/202604112100.gif");
  });
});

// ── parseArgs ────────────────────────────────────────────────

describe("parseArgs", () => {
  it("returns the current time and the output directory, animate defaulting to false", () => {
    const before = Date.now();
    const options = parseArgs(["node", "cli.js", "-d", "/tmp"]);
    const after = Date.now();
    expect(options.now.getTime()).toBeGreaterThanOrEqual(before);
    expect(options.now.getTime()).toBeLessThanOrEqual(after);
    expect(options.animate).toBe(false);
    expect(options.outputDir).toBe("/tmp");
  });

  it("accepts --output-dir and sets animate to true when --animate is passed", () => {
    const options = parseArgs(["node", "cli.js", "--output-dir", "/tmp", "--animate"]);
    expect(options.animate).toBe(true);
    expect(options.outputDir).toBe("/tmp");
  });

  it("throws a usage error when the output directory is missing", () => {
    expect(() => parseArgs(["node", "cli.js"])).toThrow("Usage: amesh -d <output-dir> [--animate]");
    expect(() => parseArgs(["node", "cli.js", "--animate"])).toThrow("Usage: amesh -d <output-dir> [--animate]");
    expect(() => parseArgs(["node", "cli.js", "-d", ""])).toThrow("Usage: amesh -d <output-dir> [--animate]");
  });

  it("rejects positional arguments", () => {
    expect(() => parseArgs(["node", "cli.js", "-d", "/tmp", "amesh.png"])).toThrow();
  });
});

// ── fetchImage ───────────────────────────────────────────────

describe("fetchImage", () => {
  it("returns the response body as a Buffer on success", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(bytes, { status: 200 })),
    );
    try {
      const buf = await fetchImage("https://example.com/a.jpg");
      expect(buf).toEqual(Buffer.from(bytes));
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("throws an Error with status details when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 404, statusText: "Not Found" })),
    );
    try {
      await expect(fetchImage("https://example.com/missing.gif")).rejects.toThrow(
        "HTTP 404 Not Found fetching https://example.com/missing.gif",
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

// ── run ──────────────────────────────────────────────────────

// A valid 1x1 transparent PNG, used as stand-in image bytes so sharp can decode it.
const ONE_PX_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

describe("run", () => {
  let baseDir: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), "amesh-test-"));
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("fetches the three layers, writes <outputDir>/amesh.png, and prints its path as JSON", async () => {
    const requestedUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        requestedUrls.push(url);
        return new Response(ONE_PX_PNG, { status: 200 });
      }),
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const expectedPath = join(baseDir, "amesh.png");

    const code = await run({ now: new Date("2026-04-11T12:07:30.000Z"), animate: false, outputDir: baseDir });
    expect(code).toBe(0);
    expect(requestedUrls).toEqual([
      "https://tokyo-ame.jwa.or.jp/map/map000.jpg",
      "https://tokyo-ame.jwa.or.jp/mesh/000/202604112100.gif",
      "https://tokyo-ame.jwa.or.jp/map/msk000.png",
    ]);

    const output = JSON.parse(log.mock.calls[0]?.[0] as string) as RunOutput;
    expect(output).toEqual({
      timestamp: "202604112100",
      content_type: "image/png",
      path: expectedPath,
    });
    const written = await readFile(expectedPath);
    expect(written.subarray(1, 4).toString("ascii")).toBe("PNG");
  });

  it("propagates an error when any layer fails to fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 500, statusText: "Internal Server Error" })),
    );
    await expect(run({ now: new Date(), animate: false, outputDir: baseDir })).rejects.toThrow(
      "HTTP 500 Internal Server Error",
    );
  });

  it("with animate: true, fetches map/mask once and 24 mesh frames, then writes <outputDir>/amesh.gif", async () => {
    const requestedUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        requestedUrls.push(url);
        return new Response(ONE_PX_PNG, { status: 200 });
      }),
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const expectedPath = join(baseDir, "amesh.gif");

    const code = await run({ now: new Date("2026-04-11T12:07:30.000Z"), animate: true, outputDir: baseDir });
    expect(code).toBe(0);
    expect(requestedUrls[0]).toBe("https://tokyo-ame.jwa.or.jp/map/map000.jpg");
    expect(requestedUrls[1]).toBe("https://tokyo-ame.jwa.or.jp/map/msk000.png");
    expect(requestedUrls).toHaveLength(2 + 24);
    expect(requestedUrls[requestedUrls.length - 1]).toBe("https://tokyo-ame.jwa.or.jp/mesh/000/202604112100.gif");

    const output = JSON.parse(log.mock.calls[0]?.[0] as string) as RunOutput;
    expect(output).toEqual({
      timestamp: "202604112100",
      content_type: "image/gif",
      path: expectedPath,
    });
    const written = await readFile(expectedPath);
    expect(written.subarray(0, 6).toString("ascii")).toBe("GIF89a");
  });

  it("overwrites an existing file at the output path without leaving a temporary file", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(ONE_PX_PNG, { status: 200 })),
    );
    vi.spyOn(console, "log").mockImplementation(() => {});
    const expectedPath = join(baseDir, "amesh.png");
    await writeFile(expectedPath, "stale");

    await run({ now: new Date("2026-04-11T12:07:30.000Z"), animate: false, outputDir: baseDir });

    const written = await readFile(expectedPath);
    expect(written.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(await readdir(baseDir)).toEqual(["amesh.png"]);
  });

  it("removes the temporary file and rethrows when replacing the output file fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(ONE_PX_PNG, { status: 200 })),
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    // A directory at the output path lets the temp file be written but makes rename fail.
    const expectedPath = join(baseDir, "amesh.png");
    await mkdir(expectedPath);

    await expect(
      run({ now: new Date("2026-04-11T12:07:30.000Z"), animate: false, outputDir: baseDir }),
    ).rejects.toThrow();
    expect(await readdir(baseDir)).toEqual(["amesh.png"]);
    expect(log).not.toHaveBeenCalled();
  });
});

// composeImage and composeAnimation have no dedicated unit tests; their output
// format is exercised indirectly via the `run` tests above. The `run` tests use
// identical bytes for all layers/frames, so they cannot catch a regression in
// layer order, frame order, or the animation's loop/delay settings.
