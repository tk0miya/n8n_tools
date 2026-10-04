import { describe, expect, it } from "vitest";
import { buildSearchQuery, classifyPullRequest, parseArgs } from "#ghmerge/main.ts";
import type { MergeCandidate } from "#github/pullRequestMerger.ts";

// ── Helpers ─────────────────────────────────────────────────

function candidate(overrides: Partial<MergeCandidate> = {}): MergeCandidate {
  return {
    repo: "testuser/repo",
    number: 1,
    title: "Bump something",
    url: "https://github.com/testuser/repo/pull/1",
    isDraft: false,
    mergeable: "MERGEABLE",
    headRefOid: "abc123",
    statusState: "SUCCESS",
    ...overrides,
  };
}

// ── parseArgs ─────────────────────────────────────────────

describe("parseArgs", () => {
  it("accepts multiple repositories", () => {
    expect(parseArgs(["node", "cli.ts", "testuser/repo", "testorg/other.js"])).toEqual({
      repos: ["testuser/repo", "testorg/other.js"],
    });
  });

  it("throws when no repository is given", () => {
    expect(() => parseArgs(["node", "cli.ts"])).toThrow(/Usage/);
  });

  it("throws on a repository without owner", () => {
    expect(() => parseArgs(["node", "cli.ts", "repo"])).toThrow(/Invalid repository name: repo/);
  });

  it("throws on unknown options", () => {
    expect(() => parseArgs(["node", "cli.ts", "--dry-run", "testuser/repo"])).toThrow();
  });
});

// ── buildSearchQuery ──────────────────────────────────────

describe("buildSearchQuery", () => {
  it("builds a query covering all repositories", () => {
    expect(buildSearchQuery(["testuser/a", "testuser/b"])).toBe(
      "is:pr is:open label:auto-label repo:testuser/a repo:testuser/b",
    );
  });
});

// ── classifyPullRequest ───────────────────────────────────

describe("classifyPullRequest", () => {
  it("returns null for a mergeable pull request with passing CI", () => {
    expect(classifyPullRequest(candidate())).toBeNull();
  });

  it("skips draft pull requests", () => {
    expect(classifyPullRequest(candidate({ isDraft: true }))).toBe("draft");
  });

  it("skips conflicting pull requests", () => {
    expect(classifyPullRequest(candidate({ mergeable: "CONFLICTING" }))).toBe("conflict");
  });

  it("skips pull requests whose mergeability is not computed yet", () => {
    expect(classifyPullRequest(candidate({ mergeable: "UNKNOWN" }))).toBe("mergeable_pending");
  });

  it("skips pull requests without any checks", () => {
    expect(classifyPullRequest(candidate({ statusState: null }))).toBe("no_checks");
  });

  it.each(["PENDING", "EXPECTED"] as const)("skips pull requests whose CI is %s", (state) => {
    expect(classifyPullRequest(candidate({ statusState: state }))).toBe("ci_pending");
  });

  it.each(["FAILURE", "ERROR"] as const)("skips pull requests whose CI is %s", (state) => {
    expect(classifyPullRequest(candidate({ statusState: state }))).toBe("ci_failure");
  });
});
