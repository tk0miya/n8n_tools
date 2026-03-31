import { describe, expect, it } from "vitest";
import { filterRepositories, hasOutdatedLanguageVersion, parseMinorVersion } from "@/ghscan/main.js";
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

// ── filterRepositories ──────────────────────────────────────

describe("filterRepositories", () => {
  const latestVersions = new Map<string, readonly [number, number]>([
    ["ruby", [4, 0]],
    ["node", [22, 14]],
    ["python", [3, 13]],
  ]);

  it("returns only repositories with at least one open PR", () => {
    const repos = [
      repo({ name: "repo1", pullRequestsCount: 0 }),
      repo({ name: "repo2", pullRequestsCount: 2 }),
      repo({ name: "repo3", pullRequestsCount: 0 }),
      repo({ name: "repo4", pullRequestsCount: 3 }),
    ];
    const result = filterRepositories(repos, latestVersions);
    expect(result.map((r) => r.name)).toEqual(["repo2", "repo4"]);
  });

  it("includes a repository with outdated language version", () => {
    const repos = [repo({ name: "outdated", languageVersions: { ruby: ["3.2"] } })];
    const result = filterRepositories(repos, latestVersions);
    expect(result.map((r) => r.name)).toEqual(["outdated"]);
  });

  it("excludes a repository with the latest language version", () => {
    const repos = [repo({ name: "current", languageVersions: { ruby: ["4.0"] } })];
    expect(filterRepositories(repos, latestVersions)).toEqual([]);
  });

  it("includes a repository missing actionlint", () => {
    const repos = [repo({ name: "no-actionlint", languageVersions: { ruby: ["4.0"] }, noActionlint: true })];
    const result = filterRepositories(repos, latestVersions);
    expect(result.map((r) => r.name)).toEqual(["no-actionlint"]);
  });

  it("excludes a repository running actionlint with no other flags", () => {
    const repos = [repo({ name: "with-actionlint", languageVersions: { ruby: ["4.0"] } })];
    expect(filterRepositories(repos, latestVersions)).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    expect(filterRepositories([], latestVersions)).toEqual([]);
  });
});

// ── hasOutdatedLanguageVersion ──────────────────────────────

describe("hasOutdatedLanguageVersion", () => {
  const latestVersions = new Map<string, readonly [number, number]>([["ruby", [4, 0]]]);

  it("returns true when all versions are older than the latest", () => {
    expect(hasOutdatedLanguageVersion(repo({ languageVersions: { ruby: ["3.2"] } }), latestVersions)).toBe(true);
  });

  it("returns false when the version matches the latest", () => {
    expect(hasOutdatedLanguageVersion(repo({ languageVersions: { ruby: ["4.0"] } }), latestVersions)).toBe(false);
  });

  it("returns false when the version is newer than the latest", () => {
    expect(hasOutdatedLanguageVersion(repo({ languageVersions: { ruby: ["4.1"] } }), latestVersions)).toBe(false);
  });

  it("returns false when versions include both outdated and latest", () => {
    expect(hasOutdatedLanguageVersion(repo({ languageVersions: { ruby: ["3.2", "4.0"] } }), latestVersions)).toBe(
      false,
    );
  });

  it("returns false when languageVersions is empty", () => {
    expect(hasOutdatedLanguageVersion(repo(), latestVersions)).toBe(false);
  });

  it("returns false when the language is not tracked", () => {
    expect(hasOutdatedLanguageVersion(repo({ languageVersions: { go: ["1.22"] } }), latestVersions)).toBe(false);
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
