import type { Octokit } from "@octokit/rest";

export type VersionTuple = readonly [major: number, minor: number];

const LANGUAGE_RELEASE_REPOS: ReadonlyMap<string, string> = new Map([
  ["ruby", "ruby/ruby"],
  ["node", "nodejs/node"],
  ["python", "python/cpython"],
]);

const STABLE_TAG_RE = /^v?\d+\.\d+[._]\d+$/;

export async function fetchLatestLanguageVersions(client: Octokit): Promise<Map<string, VersionTuple>> {
  const entries = await Promise.all(
    [...LANGUAGE_RELEASE_REPOS].map(async ([lang, repo]) => {
      const tag = await fetchLatestReleaseTag(client, repo);
      return [lang, parseTagToVersion(tag)] as const;
    }),
  );
  return new Map(entries);
}

function splitRepo(fullName: string): { owner: string; repo: string } {
  const [owner = "", repo = ""] = fullName.split("/");
  return { owner, repo };
}

async function fetchLatestReleaseTag(client: Octokit, repoFullName: string): Promise<string> {
  const { owner, repo } = splitRepo(repoFullName);
  try {
    const { data: release } = await client.rest.repos.getLatestRelease({ owner, repo });
    return release.tag_name;
  } catch {
    const { data: tags } = await client.rest.repos.listTags({ owner, repo });
    const stable = tags.find((t) => STABLE_TAG_RE.test(t.name));
    if (!stable) throw new Error(`No stable release found for ${repoFullName}`);
    return stable.name;
  }
}

function parseTagToVersion(tag: string): VersionTuple {
  const parts = tag.replace(/^v/, "").replace(/_/g, ".").split(".", 3);
  return [Number(parts[0]), Number(parts[1] ?? 0)];
}
