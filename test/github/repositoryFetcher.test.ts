import { RequestError } from "@octokit/request-error";
import { describe, expect, it, vi } from "vitest";
import { fetchRepositories, isActiveRepo } from "@/github/repositoryFetcher.js";

vi.mock("@/github/workflowParser.js", () => ({
  analyzeWorkflows: vi.fn().mockResolvedValue({ hasWorkflows: true, languageVersions: {}, noActionlint: false }),
}));
vi.mock("@/github/dependabotParser.js", () => ({
  analyzeDependabot: vi.fn().mockResolvedValue({ noDependabot: false, noDependabotCooldown: false }),
}));

import { analyzeDependabot } from "@/github/dependabotParser.js";
import { analyzeWorkflows } from "@/github/workflowParser.js";

const NOW = Date.now();
const MONTHS = (n: number) => NOW - n * 30 * 24 * 3600 * 1000;
const YEARS = (n: number) => NOW - n * 365 * 24 * 3600 * 1000;

function fakeRepo(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: "repo",
    html_url: "https://github.com/testuser/repo",
    pushed_at: new Date(MONTHS(3)).toISOString(),
    archived: false,
    fork: false,
    ...overrides,
  };
}

function buildClient({
  repos = [] as ReturnType<typeof fakeRepo>[],
  pullsByRepo = {} as Record<string, unknown[]>,
} = {}) {
  return {
    paginate: vi.fn().mockResolvedValue(repos),
    rest: {
      users: { getAuthenticated: vi.fn().mockResolvedValue({ data: { login: "testuser" } }) },
      repos: { listForAuthenticatedUser: "listForAuthenticatedUser" },
      pulls: {
        list: vi.fn().mockImplementation(({ owner, repo }: { owner: string; repo: string }) => ({
          data: pullsByRepo[`${owner}/${repo}`] ?? [],
        })),
      },
    },
  } as never;
}

describe("isActiveRepo", () => {
  it("returns true for a non-archived, non-fork repo pushed recently", () => {
    expect(isActiveRepo(fakeRepo() as never)).toBe(true);
  });

  it("returns false for archived repos", () => {
    expect(isActiveRepo(fakeRepo({ archived: true }) as never)).toBe(false);
  });

  it("returns false for forked repos", () => {
    expect(isActiveRepo(fakeRepo({ fork: true }) as never)).toBe(false);
  });

  it("returns false for repos not pushed in the last year", () => {
    expect(isActiveRepo(fakeRepo({ pushed_at: new Date(YEARS(2)).toISOString() }) as never)).toBe(false);
  });
});

describe("fetchRepositories", () => {
  it("returns Repository objects for active repos", async () => {
    const repos = [
      fakeRepo({ name: "repo1", html_url: "https://github.com/testuser/repo1" }),
      fakeRepo({ name: "repo2", html_url: "https://github.com/testuser/repo2" }),
    ];
    const client = buildClient({
      repos,
      pullsByRepo: {
        "testuser/repo1": [
          { title: "PR one", html_url: "https://github.com/testuser/repo1/pull/1", labels: [] },
          { title: "PR two", html_url: "https://github.com/testuser/repo1/pull/2", labels: [] },
          { title: "PR three", html_url: "https://github.com/testuser/repo1/pull/3", labels: [] },
        ],
        "testuser/repo2": [{ title: "Only PR", html_url: "https://github.com/testuser/repo2/pull/1", labels: [] }],
      },
    });

    const result = await fetchRepositories(client);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: "repo1",
      url: "https://github.com/testuser/repo1",
      pullRequests: [
        { title: "PR one", url: "https://github.com/testuser/repo1/pull/1", labels: [] },
        { title: "PR two", url: "https://github.com/testuser/repo1/pull/2", labels: [] },
        { title: "PR three", url: "https://github.com/testuser/repo1/pull/3", labels: [] },
      ],
      languageVersions: {},
      noActionlint: false,
      noDependabot: false,
      noDependabotCooldown: false,
    });
    expect(result[1]?.pullRequests).toEqual([
      { title: "Only PR", url: "https://github.com/testuser/repo2/pull/1", labels: [] },
    ]);
  });

  it("returns empty array when user has no repositories", async () => {
    const client = buildClient();
    const result = await fetchRepositories(client);
    expect(result).toEqual([]);
  });

  it("excludes archived, forked, and stale repos", async () => {
    const repos = [
      fakeRepo({ name: "active", pushed_at: new Date(MONTHS(3)).toISOString() }),
      fakeRepo({ name: "archived", archived: true }),
      fakeRepo({ name: "forked", fork: true }),
      fakeRepo({ name: "old", pushed_at: new Date(YEARS(2)).toISOString() }),
    ];
    const client = buildClient({ repos });

    const result = await fetchRepositories(client);
    const names = result.map((r) => r.name);
    expect(names).toEqual(["active"]);
  });

  it("passes language versions from workflow analysis", async () => {
    vi.mocked(analyzeWorkflows).mockResolvedValueOnce({
      hasWorkflows: true,
      languageVersions: { ruby: ["3.1", "3.2"] },
      noActionlint: false,
    });

    const repos = [fakeRepo({ name: "repo1" })];
    const client = buildClient({ repos });

    const result = await fetchRepositories(client);
    expect(result[0]?.languageVersions).toEqual({ ruby: ["3.1", "3.2"] });
  });

  it("skips dependabot analysis when the repo has no workflows", async () => {
    vi.mocked(analyzeWorkflows).mockResolvedValueOnce({
      hasWorkflows: false,
      languageVersions: {},
      noActionlint: false,
    });
    vi.mocked(analyzeDependabot).mockClear();

    const repos = [fakeRepo({ name: "data-only" })];
    const client = buildClient({ repos });

    const result = await fetchRepositories(client);
    expect(analyzeDependabot).not.toHaveBeenCalled();
    expect(result[0]?.noDependabot).toBe(false);
    expect(result[0]?.noDependabotCooldown).toBe(false);
  });

  it("returns empty pull request list when access is forbidden (403)", async () => {
    const repos = [fakeRepo({ name: "repo1", html_url: "https://github.com/testuser/repo1" })];
    const client = buildClient({ repos });
    vi.mocked(client.rest.pulls.list as ReturnType<typeof vi.fn>).mockRejectedValue(
      new RequestError("Resource not accessible by personal access token", 403, {
        request: { method: "GET", url: "", headers: {} },
      }),
    );

    const result = await fetchRepositories(client);
    expect(result[0]?.pullRequests).toEqual([]);
  });

  it("fetches PR count and workflows concurrently per repo", async () => {
    const repos = [fakeRepo({ name: "repo1" })];
    const client = buildClient({ repos });

    await fetchRepositories(client);

    expect(analyzeWorkflows).toHaveBeenCalledWith(client, "testuser/repo1");
  });

  it("passes dependabot analysis results to the repository", async () => {
    vi.mocked(analyzeDependabot).mockResolvedValueOnce({ noDependabot: false, noDependabotCooldown: true });

    const repos = [fakeRepo({ name: "repo1" })];
    const client = buildClient({ repos });

    const result = await fetchRepositories(client);
    expect(result[0]?.noDependabot).toBe(false);
    expect(result[0]?.noDependabotCooldown).toBe(true);
    expect(analyzeDependabot).toHaveBeenCalledWith(client, "testuser/repo1");
  });

  it("includes PR labels in the result", async () => {
    const repos = [fakeRepo({ name: "repo1" })];
    const client = buildClient({
      repos,
      pullsByRepo: {
        "testuser/repo1": [
          {
            title: "PR",
            html_url: "https://github.com/testuser/repo1/pull/1",
            labels: [{ name: "bug" }, { name: "urgent" }],
          },
        ],
      },
    });

    const result = await fetchRepositories(client);
    expect(result[0]?.pullRequests).toEqual([
      { title: "PR", url: "https://github.com/testuser/repo1/pull/1", labels: ["bug", "urgent"] },
    ]);
  });

  it("filters PRs to those containing all specified labels", async () => {
    const repos = [fakeRepo({ name: "repo1" })];
    const client = buildClient({
      repos,
      pullsByRepo: {
        "testuser/repo1": [
          { title: "match", html_url: "u1", labels: [{ name: "bug" }, { name: "urgent" }] },
          { title: "partial", html_url: "u2", labels: [{ name: "bug" }] },
          { title: "none", html_url: "u3", labels: [] },
        ],
      },
    });

    const result = await fetchRepositories(client, { labels: ["bug", "urgent"] });
    expect(result[0]?.pullRequests.map((pr) => pr.title)).toEqual(["match"]);
  });

  it("returns all PRs when no labels are specified", async () => {
    const repos = [fakeRepo({ name: "repo1" })];
    const client = buildClient({
      repos,
      pullsByRepo: {
        "testuser/repo1": [
          { title: "a", html_url: "u1", labels: [{ name: "bug" }] },
          { title: "b", html_url: "u2", labels: [] },
        ],
      },
    });

    const result = await fetchRepositories(client, { labels: [] });
    expect(result[0]?.pullRequests).toHaveLength(2);
  });
});
