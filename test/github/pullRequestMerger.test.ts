import { describe, expect, it, vi } from "vitest";
import type { MergeCandidate } from "#github/pullRequestMerger.ts";
import { mergePullRequest, searchPullRequests } from "#github/pullRequestMerger.ts";

// ── Helpers ─────────────────────────────────────────────────

function fakeNode(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    number: 1,
    title: "Bump something",
    url: "https://github.com/testuser/repo/pull/1",
    isDraft: false,
    mergeable: "MERGEABLE",
    headRefOid: "abc123",
    repository: { nameWithOwner: "testuser/repo" },
    commits: { nodes: [{ commit: { statusCheckRollup: { state: "SUCCESS" } } }] },
    ...overrides,
  };
}

function buildClient(nodes: unknown[] = []) {
  return {
    graphql: vi.fn().mockResolvedValue({ search: { nodes } }),
    rest: { pulls: { merge: vi.fn().mockResolvedValue({}) } },
  };
}

// ── searchPullRequests ────────────────────────────────────

describe("searchPullRequests", () => {
  it("passes the query and converts nodes into candidates", async () => {
    const client = buildClient([fakeNode()]);
    const result = await searchPullRequests(client as never, "is:pr repo:testuser/repo");

    expect(client.graphql).toHaveBeenCalledWith(expect.any(String), { q: "is:pr repo:testuser/repo" });
    expect(result).toEqual([
      {
        repo: "testuser/repo",
        number: 1,
        title: "Bump something",
        url: "https://github.com/testuser/repo/pull/1",
        isDraft: false,
        mergeable: "MERGEABLE",
        headRefOid: "abc123",
        statusState: "SUCCESS",
      },
    ]);
  });

  it("returns null status when the commit has no checks", async () => {
    const client = buildClient([fakeNode({ commits: { nodes: [{ commit: { statusCheckRollup: null } }] } })]);
    const [pr] = await searchPullRequests(client as never, "q");
    expect(pr.statusState).toBeNull();
  });

  it("returns null status when the pull request has no commits", async () => {
    const client = buildClient([fakeNode({ commits: { nodes: [] } })]);
    const [pr] = await searchPullRequests(client as never, "q");
    expect(pr.statusState).toBeNull();
  });
});

// ── mergePullRequest ──────────────────────────────────────

describe("mergePullRequest", () => {
  it("merges pinned to the verified head commit", async () => {
    const client = buildClient();
    const pr = { repo: "testuser/repo", number: 12, headRefOid: "abc123" } as MergeCandidate;
    await mergePullRequest(client as never, pr);

    expect(client.rest.pulls.merge).toHaveBeenCalledWith({
      owner: "testuser",
      repo: "repo",
      pull_number: 12,
      sha: "abc123",
    });
  });
});
