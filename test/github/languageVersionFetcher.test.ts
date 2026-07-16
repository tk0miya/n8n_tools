import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLatestLanguageVersions } from "#github/languageVersionFetcher.js";

interface ScheduleEntry {
  start?: string;
  lts?: string;
  maintenance?: string;
  end?: string;
}

const DEFAULT_SCHEDULE: Record<string, ScheduleEntry> = {
  v22: { start: "2024-04-24", lts: "2024-10-29", end: "2027-04-30" },
  v24: { start: "2025-05-06", lts: "2025-10-28", end: "2028-04-30" },
  v26: { start: "2026-04-22", lts: "2026-10-28", end: "2029-04-30" },
};

function buildClient({
  latestRelease = {} as Record<string, string>,
  tags = {} as Record<string, { name: string }[]>,
  schedule = DEFAULT_SCHEDULE,
} = {}) {
  return {
    rest: {
      repos: {
        getLatestRelease: vi.fn().mockImplementation(({ owner, repo }: { owner: string; repo: string }) => {
          const fullName = `${owner}/${repo}`;
          if (fullName in latestRelease) {
            return { data: { tag_name: latestRelease[fullName] } };
          }
          throw new Error("Not Found");
        }),
        listTags: vi.fn().mockImplementation(({ owner, repo: name }: { owner: string; repo: string }) => {
          const fullName = `${owner}/${name}`;
          return { data: tags[fullName] ?? [] };
        }),
        getContent: vi
          .fn()
          .mockImplementation(({ owner, repo, path }: { owner: string; repo: string; path: string }) => {
            if (owner === "nodejs" && repo === "Release" && path === "schedule.json") {
              const content = Buffer.from(JSON.stringify(schedule)).toString("base64");
              return { data: { content, type: "file" } };
            }
            throw new Error("Not Found");
          }),
      },
    },
  } as never;
}

describe("fetchLatestLanguageVersions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-06T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the latest major.minor version for each language", async () => {
    const client = buildClient({
      latestRelease: {
        "ruby/ruby": "v4_0_2",
        "python/cpython": "v3.13.3",
      },
    });
    const result = await fetchLatestLanguageVersions(client);
    expect(result).toEqual(
      new Map([
        ["ruby", [4, 0]],
        ["node", [24, 99]],
        ["python", [3, 13]],
      ]),
    );
  });

  it("falls back to stable tags when a repo has no releases", async () => {
    const client = buildClient({
      latestRelease: {
        "ruby/ruby": "v4_0_2",
      },
      tags: {
        "python/cpython": [{ name: "v3.15.0a7" }, { name: "v3.14.1" }, { name: "v3.13.3" }],
      },
    });
    const result = await fetchLatestLanguageVersions(client);
    expect(result.get("python")).toEqual([3, 14]);
  });

  it("ignores Node.js majors that have not yet entered LTS", async () => {
    const client = buildClient({
      latestRelease: {
        "ruby/ruby": "v4_0_2",
        "python/cpython": "v3.13.3",
      },
    });
    const result = await fetchLatestLanguageVersions(client);
    expect(result.get("node")).toEqual([24, 99]);
  });

  it("picks the new Node.js LTS once its lts date has passed", async () => {
    vi.setSystemTime(new Date("2026-11-01T00:00:00Z"));
    const client = buildClient({
      latestRelease: {
        "ruby/ruby": "v4_0_2",
        "python/cpython": "v3.13.3",
      },
    });
    const result = await fetchLatestLanguageVersions(client);
    expect(result.get("node")).toEqual([26, 99]);
  });

  it("throws when a repo has no stable tags", async () => {
    const client = buildClient({
      latestRelease: {
        "ruby/ruby": "v4_0_2",
      },
      tags: {
        "python/cpython": [{ name: "v3.15.0a7" }],
      },
    });
    await expect(fetchLatestLanguageVersions(client)).rejects.toThrow("No stable release found for python/cpython");
  });
});
