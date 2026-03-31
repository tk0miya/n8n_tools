import { describe, expect, it, vi } from "vitest";
import { fetchRepositories, isActiveRepo } from "@/github/repositoryFetcher.js";

vi.mock("@/github/workflowParser.js", () => ({
  analyzeWorkflows: vi.fn().mockResolvedValue({ languageVersions: {}, noActionlint: false }),
}));

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
        "testuser/repo1": [{}, {}, {}],
        "testuser/repo2": [{}],
      },
    });

    const result = await fetchRepositories(client);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: "repo1",
      url: "https://github.com/testuser/repo1",
      pullRequestsCount: 3,
      languageVersions: {},
      noActionlint: false,
    });
    expect(result[1]?.pullRequestsCount).toBe(1);
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
      languageVersions: { ruby: ["3.1", "3.2"] },
      noActionlint: false,
    });

    const repos = [fakeRepo({ name: "repo1" })];
    const client = buildClient({ repos });

    const result = await fetchRepositories(client);
    expect(result[0]?.languageVersions).toEqual({ ruby: ["3.1", "3.2"] });
  });

  it("fetches PR count and workflows concurrently per repo", async () => {
    const repos = [fakeRepo({ name: "repo1" })];
    const client = buildClient({ repos });

    await fetchRepositories(client);

    expect(analyzeWorkflows).toHaveBeenCalledWith(client, "testuser/repo1");
  });
});
