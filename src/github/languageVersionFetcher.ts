import type { Octokit } from "@octokit/rest";

export type VersionTuple = readonly [major: number, minor: number];

const LANGUAGE_RELEASE_REPOS: ReadonlyMap<string, string> = new Map([
  ["ruby", "ruby/ruby"],
  ["node", "nodejs/node"],
  ["python", "python/cpython"],
]);

const STABLE_TAG_RE = /^v?\d+\.\d+[._]\d+$/;

/** Languages where only even-numbered major versions count as stable (LTS). */
const LTS_EVEN_MAJOR_LANGUAGES: ReadonlySet<string> = new Set(["node"]);

export async function fetchLatestLanguageVersions(client: Octokit): Promise<Map<string, VersionTuple>> {
  const entries = await Promise.all(
    [...LANGUAGE_RELEASE_REPOS].map(async ([lang, repo]) => {
      const ltsOnly = LTS_EVEN_MAJOR_LANGUAGES.has(lang);
      const tag = ltsOnly ? await fetchLatestLtsTag(client, repo) : await fetchLatestReleaseTag(client, repo);
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

async function fetchLatestLtsTag(client: Octokit, repoFullName: string): Promise<string> {
  const { owner, repo } = splitRepo(repoFullName);
  const { data: tags } = await client.rest.repos.listTags({ owner, repo, per_page: 100 });
  const lts = tags.find((t) => {
    if (!STABLE_TAG_RE.test(t.name)) return false;
    const major = Number(t.name.replace(/^v/, "").split(/[._]/)[0]);
    return major % 2 === 0;
  });
  if (!lts) throw new Error(`No LTS release found for ${repoFullName}`);
  return lts.name;
}

function parseTagToVersion(tag: string): VersionTuple {
  const parts = tag.replace(/^v/, "").replace(/_/g, ".").split(".", 3);
  return [Number(parts[0]), Number(parts[1] ?? 0)];
}
