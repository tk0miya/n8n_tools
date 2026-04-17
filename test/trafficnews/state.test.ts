import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, aroundEach, beforeEach, describe, expect, it } from "vitest";
import type { TrafficNewsState } from "@/trafficnews/state.js";
import {
  emptyState,
  getDefaultStatePath,
  loadState,
  resolveStatePath,
  STATE_VERSION,
  saveState,
} from "@/trafficnews/state.js";

describe("resolveStatePath", () => {
  it("leaves absolute paths alone", () => {
    expect(resolveStatePath("/tmp/custom.json")).toBe("/tmp/custom.json");
  });

  it("resolves relative paths against cwd", () => {
    const resolved = resolveStatePath("./trafficnews_state.json");
    expect(resolved.startsWith("/")).toBe(true);
    expect(resolved.endsWith("trafficnews_state.json")).toBe(true);
  });
});

describe("getDefaultStatePath", () => {
  aroundEach(async (test) => {
    const savedXdgStateHome = process.env.XDG_STATE_HOME;
    await test();
    if (savedXdgStateHome === undefined) delete process.env.XDG_STATE_HOME;
    else process.env.XDG_STATE_HOME = savedXdgStateHome;
  });

  it("returns XDG_STATE_HOME-based path when XDG_STATE_HOME is set", () => {
    process.env.XDG_STATE_HOME = "/custom/xdg";
    expect(getDefaultStatePath()).toBe("/custom/xdg/trafficnews/state.json");
  });

  it("falls back to ~/.local/state when XDG_STATE_HOME is not set", () => {
    delete process.env.XDG_STATE_HOME;
    expect(getDefaultStatePath()).toMatch(/\/\.local\/state\/trafficnews\/state\.json$/);
  });
});

describe("loadState", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "trafficnews-state-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("returns empty state when file is missing", async () => {
    const state = await loadState(join(dir, "missing.json"));
    expect(state).toEqual(emptyState());
  });

  it("loads a valid state file", async () => {
    const path = join(dir, "state.json");
    const initial: TrafficNewsState = {
      version: STATE_VERSION,
      seenUrls: ["https://trafficnews.jp/post/12345", "https://trafficnews.jp/post/67890"],
    };
    await writeFile(path, JSON.stringify(initial), "utf8");
    const loaded = await loadState(path);
    expect(loaded).toEqual(initial);
  });

  it("falls back to empty state on JSON parse error", async () => {
    const path = join(dir, "broken.json");
    await writeFile(path, "not json at all", "utf8");
    const loaded = await loadState(path);
    expect(loaded).toEqual(emptyState());
  });

  it("falls back to empty state on version mismatch", async () => {
    const path = join(dir, "oldversion.json");
    await writeFile(path, JSON.stringify({ version: 0, seenUrls: [] }), "utf8");
    const loaded = await loadState(path);
    expect(loaded).toEqual(emptyState());
  });

  it("falls back to empty state when seenUrls is not an array", async () => {
    const path = join(dir, "badschema.json");
    await writeFile(path, JSON.stringify({ version: STATE_VERSION, seenUrls: "not-an-array" }), "utf8");
    const loaded = await loadState(path);
    expect(loaded).toEqual(emptyState());
  });

  it("falls back to empty state when seenUrls contains non-strings", async () => {
    const path = join(dir, "badentries.json");
    await writeFile(path, JSON.stringify({ version: STATE_VERSION, seenUrls: [42, true] }), "utf8");
    const loaded = await loadState(path);
    expect(loaded).toEqual(emptyState());
  });
});

describe("saveState", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "trafficnews-save-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes state atomically and is round-trippable", async () => {
    const path = join(dir, "nested/a/b/state.json");
    const state: TrafficNewsState = {
      version: STATE_VERSION,
      seenUrls: ["https://trafficnews.jp/post/12345"],
    };
    await saveState(state, path);
    const raw = await readFile(path, "utf8");
    expect(JSON.parse(raw)).toEqual(state);

    const loaded = await loadState(path);
    expect(loaded).toEqual(state);
  });
});
