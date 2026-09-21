import { describe, expect, it, vi } from "vitest";
import type { RunOutput } from "#amesh/main.js";
import {
  buildMapUrl,
  buildMaskUrl,
  buildMeshUrl,
  computeMeshTimestamp,
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
  it("returns the current time with no arguments", () => {
    const before = Date.now();
    const options = parseArgs(["node", "cli.js"]);
    const after = Date.now();
    expect(options.now.getTime()).toBeGreaterThanOrEqual(before);
    expect(options.now.getTime()).toBeLessThanOrEqual(after);
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
  it("fetches the three layers, composes them, and prints base64 JSON output", async () => {
    const requestedUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        requestedUrls.push(url);
        return new Response(ONE_PX_PNG, { status: 200 });
      }),
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const code = await run({ now: new Date("2026-04-11T12:07:30.000Z") });
      expect(code).toBe(0);
      expect(requestedUrls).toEqual([
        "https://tokyo-ame.jwa.or.jp/map/map000.jpg",
        "https://tokyo-ame.jwa.or.jp/mesh/000/202604112100.gif",
        "https://tokyo-ame.jwa.or.jp/map/msk000.png",
      ]);

      const output = JSON.parse(log.mock.calls[0]?.[0] as string) as RunOutput;
      expect(output.timestamp).toBe("202604112100");
      expect(output.content_type).toBe("image/png");
      expect(typeof output.image_base64).toBe("string");
      expect(output.image_base64.length).toBeGreaterThan(0);
    } finally {
      log.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("propagates an error when any layer fails to fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 500, statusText: "Internal Server Error" })),
    );
    try {
      await expect(run({ now: new Date() })).rejects.toThrow("HTTP 500 Internal Server Error");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

// composeImage has no dedicated unit test; its output format is exercised
// indirectly via the `run` tests above. The `run` tests use identical bytes
// for all three layers, so they cannot catch a regression in layer order.
