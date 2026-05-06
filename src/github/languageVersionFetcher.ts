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
      const version = await fetchLatestVersion(client, lang, repo);
      return [lang, version] as const;
    }),
  );
  return new Map(entries);
}

async function fetchLatestVersion(client: Octokit, lang: string, repo: string): Promise<VersionTuple> {
  switch (lang) {
    case "node":
      return fetchLatestNodeLtsVersion(client);
    default:
      return parseTagToVersion(await fetchLatestReleaseTag(client, repo));
  }
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

async function fetchLatestNodeLtsVersion(client: Octokit): Promise<VersionTuple> {
  const { data } = await client.rest.repos.getContent({
    owner: "nodejs",
    repo: "Release",
    path: "schedule.json",
  });
  if (Array.isArray(data) || !("content" in data) || !data.content) {
    throw new Error("Failed to fetch nodejs/Release schedule.json");
  }
  const json = JSON.parse(Buffer.from(data.content, "base64").toString("utf-8")) as Record<string, unknown>;
  const today = new Date();
  let maxMajor = -1;
  for (const [key, entry] of Object.entries(json)) {
    if (typeof entry !== "object" || entry === null) continue;
    const { lts, end } = entry as { lts?: string; end?: string };
    if (!lts || !end) continue;
    if (new Date(lts) <= today && today < new Date(end)) {
      const major = Number(key.replace(/^v/, ""));
      if (Number.isFinite(major) && major > maxMajor) maxMajor = major;
    }
  }
  if (maxMajor < 0) throw new Error("No active Node.js LTS major found");
  return [maxMajor, 99];
}

function parseTagToVersion(tag: string): VersionTuple {
  const parts = tag.replace(/^v/, "").replace(/_/g, ".").split(".", 3);
  return [Number(parts[0]), Number(parts[1] ?? 0)];
}
