import { describe, expect, it } from "vitest";
import type { ScanResult } from "@/ghscan/main.js";
import { detectOutdatedLanguages, filterScanResults, parseMinorVersion, toScanResult } from "@/ghscan/main.js";
import type { Repository } from "@/github/repository.js";

// ── Helpers ─────────────────────────────────────────────────

function repo(overrides: Partial<Repository> = {}): Repository {
  return {
    name: "repo",
    url: "https://github.com/testuser/repo",
    pullRequestsCount: 0,
    languageVersions: {},
    noActionlint: false,
    ...overrides,
  };
}

function scanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    name: "repo",
    url: "https://github.com/testuser/repo",
    pullRequestsCount: 0,
    outdatedLanguages: [],
    noActionlint: false,
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
      pullRequestsCount: 0,
      outdatedLanguages: ["ruby"],
      noActionlint: false,
    });
  });

  it("excludes languageVersions from the result", () => {
    const result = toScanResult(repo({ languageVersions: { ruby: ["4.0"] } }), latestVersions);
    expect(result).not.toHaveProperty("languageVersions");
  });
});

// ── filterScanResults ──────────────────────────────────────

describe("filterScanResults", () => {
  it("returns only results with at least one open PR", () => {
    const results = [
      scanResult({ name: "repo1", pullRequestsCount: 0 }),
      scanResult({ name: "repo2", pullRequestsCount: 2 }),
      scanResult({ name: "repo3", pullRequestsCount: 0 }),
      scanResult({ name: "repo4", pullRequestsCount: 3 }),
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
