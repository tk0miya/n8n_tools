import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AccountRunResult, TwcheckState } from "@/twcheck/state.js";
import {
  emptyState,
  getAccountState,
  loadState,
  mergeStateAfterRun,
  resolveStatePath,
  STATE_VERSION,
  saveState,
} from "@/twcheck/state.js";

describe("resolveStatePath", () => {
  it("leaves absolute paths alone", () => {
    expect(resolveStatePath("/tmp/custom.json")).toBe("/tmp/custom.json");
  });

  it("resolves relative paths against cwd", () => {
    const resolved = resolveStatePath("./twcheck_state.json");
    expect(resolved.startsWith("/")).toBe(true);
    expect(resolved.endsWith("twcheck_state.json")).toBe(true);
  });
});

describe("loadState", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "twcheck-state-"));
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
    const initial: TwcheckState = {
      version: STATE_VERSION,
      accounts: {
        elonmusk: { lastSeenId: "12345", lastCheckedAt: "2026-04-01T00:00:00.000Z" },
      },
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
    await writeFile(path, JSON.stringify({ version: 0, accounts: {} }), "utf8");
    const loaded = await loadState(path);
    expect(loaded).toEqual(emptyState());
  });

  it("falls back to empty state when accounts entry schema is wrong", async () => {
    const path = join(dir, "badschema.json");
    await writeFile(path, JSON.stringify({ version: STATE_VERSION, accounts: { a: 42 } }), "utf8");
    const loaded = await loadState(path);
    expect(loaded).toEqual(emptyState());
  });
});

describe("saveState", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "twcheck-save-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes state atomically and is round-trippable", async () => {
    const path = join(dir, "nested/a/b/state.json");
    const state: TwcheckState = {
      version: STATE_VERSION,
      accounts: {
        elonmusk: { lastSeenId: "999", lastCheckedAt: "2026-04-10T00:00:00.000Z" },
      },
    };
    await saveState(state, path);
    const raw = await readFile(path, "utf8");
    expect(JSON.parse(raw)).toEqual(state);

    const loaded = await loadState(path);
    expect(loaded).toEqual(state);
  });
});

describe("mergeStateAfterRun", () => {
  const NOW = new Date("2026-04-11T12:00:00.000Z");

  it("updates lastSeenId for successful accounts", () => {
    const state: TwcheckState = {
      version: STATE_VERSION,
      accounts: {
        elonmusk: { lastSeenId: "100", lastCheckedAt: "2026-04-01T00:00:00.000Z" },
      },
    };
    const results: AccountRunResult[] = [{ username: "elonmusk", status: "ok", newLastSeenId: "200" }];
    const next = mergeStateAfterRun(state, results, NOW);
    expect(next.accounts.elonmusk).toEqual({
      lastSeenId: "200",
      lastCheckedAt: NOW.toISOString(),
    });
  });

  it("keeps existing lastSeenId when error occurs", () => {
    const state: TwcheckState = {
      version: STATE_VERSION,
      accounts: {
        elonmusk: { lastSeenId: "100", lastCheckedAt: "2026-04-01T00:00:00.000Z" },
      },
    };
    const results: AccountRunResult[] = [{ username: "elonmusk", status: "error" }];
    const next = mergeStateAfterRun(state, results, NOW);
    expect(next.accounts.elonmusk).toEqual({
      lastSeenId: "100",
      lastCheckedAt: "2026-04-01T00:00:00.000Z",
    });
  });

  it("records baseline_established entries with their newLastSeenId", () => {
    const state = emptyState();
    const results: AccountRunResult[] = [
      { username: "elonmusk", status: "baseline_established", newLastSeenId: "555" },
    ];
    const next = mergeStateAfterRun(state, results, NOW);
    expect(next.accounts.elonmusk).toEqual({
      lastSeenId: "555",
      lastCheckedAt: NOW.toISOString(),
    });
  });

  it("stores account keys case-insensitively", () => {
    const state = emptyState();
    const results: AccountRunResult[] = [{ username: "ElonMusk", status: "ok", newLastSeenId: "1" }];
    const next = mergeStateAfterRun(state, results, NOW);
    expect(next.accounts.elonmusk).toBeDefined();
    expect(next.accounts.ElonMusk).toBeUndefined();
  });
});

describe("getAccountState", () => {
  it("looks up accounts case-insensitively", () => {
    const state: TwcheckState = {
      version: STATE_VERSION,
      accounts: {
        elonmusk: { lastSeenId: "1", lastCheckedAt: "2026-04-01T00:00:00.000Z" },
      },
    };
    expect(getAccountState(state, "ElonMusk")?.lastSeenId).toBe("1");
    expect(getAccountState(state, "sama")).toBeUndefined();
  });
});
