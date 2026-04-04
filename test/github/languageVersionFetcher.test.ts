import { describe, expect, it, vi } from "vitest";
import { fetchLatestLanguageVersions } from "@/github/languageVersionFetcher.js";

function buildClient({
  latestRelease = {} as Record<string, string>,
  tags = {} as Record<string, { name: string }[]>,
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
      },
    },
  } as never;
}

describe("fetchLatestLanguageVersions", () => {
  it("returns the latest major.minor version for each language", async () => {
    const client = buildClient({
      latestRelease: {
        "ruby/ruby": "v4_0_2",
        "python/cpython": "v3.13.3",
      },
      tags: {
        "nodejs/node": [{ name: "v25.9.0" }, { name: "v24.14.1" }, { name: "v22.14.0" }],
      },
    });
    const result = await fetchLatestLanguageVersions(client);
    expect(result).toEqual(
      new Map([
        ["ruby", [4, 0]],
        ["node", [24, 14]],
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
        "nodejs/node": [{ name: "v24.14.1" }],
        "python/cpython": [{ name: "v3.15.0a7" }, { name: "v3.14.1" }, { name: "v3.13.3" }],
      },
    });
    const result = await fetchLatestLanguageVersions(client);
    expect(result.get("python")).toEqual([3, 14]);
  });

  it("picks the latest even-major tag for Node.js (LTS)", async () => {
    const client = buildClient({
      latestRelease: {
        "ruby/ruby": "v4_0_2",
        "python/cpython": "v3.13.3",
      },
      tags: {
        "nodejs/node": [{ name: "v25.9.0" }, { name: "v25.8.0" }, { name: "v24.14.1" }, { name: "v22.14.0" }],
      },
    });
    const result = await fetchLatestLanguageVersions(client);
    expect(result.get("node")).toEqual([24, 14]);
  });

  it("throws when a repo has no stable tags", async () => {
    const client = buildClient({
      latestRelease: {
        "ruby/ruby": "v4_0_2",
      },
      tags: {
        "nodejs/node": [{ name: "v24.14.1" }],
        "python/cpython": [{ name: "v3.15.0a7" }],
      },
    });
    await expect(fetchLatestLanguageVersions(client)).rejects.toThrow("No stable release found for python/cpython");
  });
});
