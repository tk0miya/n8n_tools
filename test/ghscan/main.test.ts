import { describe, expect, it } from "vitest";
import type { ScanResult } from "@/ghscan/main.js";
import {
  detectOutdatedLanguages,
  filterScanResults,
  parseArgs,
  parseMinorVersion,
  toScanResult,
} from "@/ghscan/main.js";
import type { Repository } from "@/github/repository.js";

// ── Helpers ─────────────────────────────────────────────────

function repo(overrides: Partial<Repository> = {}): Repository {
  return {
    name: "repo",
    url: "https://github.com/testuser/repo",
    pullRequests: [],
    languageVersions: {},
    noActionlint: false,
    noDependabot: false,
    noDependabotCooldown: false,
    ...overrides,
  };
}

function scanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    name: "repo",
    url: "https://github.com/testuser/repo",
    pullRequests: [],
    outdatedLanguages: [],
    noActionlint: false,
    noDependabot: false,
    noDependabotCooldown: false,
    ...overrides,
  };
}

// ── toScanResult ───────────────────────────────────────────

describe("toScanResult", () => {
  const latestVersions = new Map<string, readonly [number, number]>([
    ["ruby", [4, 0]],
    ["node", [22, 14]],
  ]);

  it("converts a repository to a scan result with outdatedLanguages", () => {
    const result = toScanResult(repo({ name: "my-repo", languageVersions: { ruby: ["3.2"] } }), latestVersions);
    expect(result).toEqual({
      name: "my-repo",
      url: "https://github.com/testuser/repo",
      pullRequests: [],
      outdatedLanguages: ["ruby"],
      noActionlint: false,
      noDependabot: false,
      noDependabotCooldown: false,
    });
  });

  it("passes through pull requests from the repository", () => {
    const pullRequests = [{ title: "Fix bug", url: "https://github.com/testuser/repo/pull/1", labels: [] }];
    const result = toScanResult(repo({ pullRequests }), latestVersions);
    expect(result.pullRequests).toEqual(pullRequests);
  });

  it("excludes languageVersions from the result", () => {
    const result = toScanResult(repo({ languageVersions: { ruby: ["4.0"] } }), latestVersions);
    expect(result).not.toHaveProperty("languageVersions");
  });
});

// ── filterScanResults ──────────────────────────────────────

describe("filterScanResults", () => {
  it("returns only results with at least one open PR", () => {
    const pr = { title: "t", url: "u", labels: [] };
    const results = [
      scanResult({ name: "repo1", pullRequests: [] }),
      scanResult({ name: "repo2", pullRequests: [pr, pr] }),
      scanResult({ name: "repo3", pullRequests: [] }),
      scanResult({ name: "repo4", pullRequests: [pr, pr, pr] }),
    ];
    expect(filterScanResults(results).map((r) => r.name)).toEqual(["repo2", "repo4"]);
  });

  it("includes a result with outdated languages", () => {
    const results = [scanResult({ name: "outdated", outdatedLanguages: ["ruby"] })];
    expect(filterScanResults(results).map((r) => r.name)).toEqual(["outdated"]);
  });

  it("excludes a result with no outdated languages", () => {
    const results = [scanResult({ name: "current" })];
    expect(filterScanResults(results)).toEqual([]);
  });

  it("includes a result missing actionlint", () => {
    const results = [scanResult({ name: "no-actionlint", noActionlint: true })];
    expect(filterScanResults(results).map((r) => r.name)).toEqual(["no-actionlint"]);
  });

  it("excludes a result running actionlint with no other flags", () => {
    const results = [scanResult({ name: "with-actionlint" })];
    expect(filterScanResults(results)).toEqual([]);
  });

  it("includes a result missing dependabot config", () => {
    const results = [scanResult({ name: "no-dependabot", noDependabot: true })];
    expect(filterScanResults(results).map((r) => r.name)).toEqual(["no-dependabot"]);
  });

  it("includes a result missing dependabot cooldown", () => {
    const results = [scanResult({ name: "no-cooldown", noDependabotCooldown: true })];
    expect(filterScanResults(results).map((r) => r.name)).toEqual(["no-cooldown"]);
  });

  it("returns empty array for empty input", () => {
    expect(filterScanResults([])).toEqual([]);
  });
});

// ── detectOutdatedLanguages ──────────────────────────────────

describe("detectOutdatedLanguages", () => {
  const latestVersions = new Map<string, readonly [number, number]>([
    ["ruby", [4, 0]],
    ["node", [22, 14]],
  ]);

  it("returns outdated language names", () => {
    const result = detectOutdatedLanguages(
      repo({ languageVersions: { ruby: ["3.2", "3.3"], node: ["18"] } }),
      latestVersions,
    );
    expect(result).toEqual(["ruby", "node"]);
  });

  it("excludes languages that include the latest version", () => {
    const result = detectOutdatedLanguages(
      repo({ languageVersions: { ruby: ["3.2", "4.0"], node: ["18"] } }),
      latestVersions,
    );
    expect(result).toEqual(["node"]);
  });

  it("returns empty array when all languages are up to date", () => {
    const result = detectOutdatedLanguages(repo({ languageVersions: { ruby: ["4.0"] } }), latestVersions);
    expect(result).toEqual([]);
  });

  it("ignores untracked languages", () => {
    const result = detectOutdatedLanguages(repo({ languageVersions: { go: ["1.22"] } }), latestVersions);
    expect(result).toEqual([]);
  });
});

// ── parseArgs ───────────────────────────────────────────────

describe("parseArgs", () => {
  const argv = (...args: string[]) => ["node", "ghscan", ...args];

  it("returns defaults when no flags are given", () => {
    expect(parseArgs(argv())).toEqual({ debug: false, labels: [] });
  });

  it("parses --debug", () => {
    expect(parseArgs(argv("--debug"))).toEqual({ debug: true, labels: [] });
  });

  it("collects multiple --label values", () => {
    expect(parseArgs(argv("--label", "bug", "--label", "urgent"))).toEqual({
      debug: false,
      labels: ["bug", "urgent"],
    });
  });
});

// ── parseMinorVersion ───────────────────────────────────────

describe("parseMinorVersion", () => {
  it("parses major.minor format", () => {
    expect(parseMinorVersion("3.2")).toEqual([3, 2]);
  });

  it("parses major.minor.patch format (ignores patch)", () => {
    expect(parseMinorVersion("3.2.1")).toEqual([3, 2]);
  });

  it("parses major-only format as latest minor (99)", () => {
    expect(parseMinorVersion("18")).toEqual([18, 99]);
  });

  it("parses version with x wildcard as latest minor (99)", () => {
    expect(parseMinorVersion("20.x")).toEqual([20, 99]);
  });
});
