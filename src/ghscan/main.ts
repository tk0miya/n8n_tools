import type { VersionTuple } from "../github/languageVersionFetcher.js";
import { fetchLatestLanguageVersions } from "../github/languageVersionFetcher.js";
import type { Repository } from "../github/repository.js";
import { fetchRepositories } from "../github/repositoryFetcher.js";

// ── Public API ──────────────────────────────────────────────

export interface RunOptions {
  debug?: boolean;
}

export async function run({ debug = false }: RunOptions = {}): Promise<void> {
  const token = requireToken();
  const { Octokit } = await import("@octokit/rest");
  const client = new Octokit({ auth: token });

  const [repositories, latestVersions] = await Promise.all([
    fetchRepositories(client, { debug }),
    fetchLatestLanguageVersions(client),
  ]);

  const filtered = filterRepositories(repositories, latestVersions);
  console.log(JSON.stringify(filtered));
}

// ── Token handling ──────────────────────────────────────────

function requireToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("Error: GITHUB_TOKEN environment variable is not set");
    process.exit(1);
  }
  return token;
}

// ── Filtering ───────────────────────────────────────────────

export function filterRepositories(
  repositories: readonly Repository[],
  latestVersions: ReadonlyMap<string, VersionTuple>,
): Repository[] {
  return repositories.filter(
    (repo) => repo.pullRequestsCount >= 1 || hasOutdatedLanguageVersion(repo, latestVersions) || repo.noActionlint,
  );
}

export function hasOutdatedLanguageVersion(
  repo: Pick<Repository, "languageVersions">,
  latestVersions: ReadonlyMap<string, VersionTuple>,
): boolean {
  return Object.entries(repo.languageVersions).some(([lang, versions]) => {
    const latest = latestVersions.get(lang);
    if (!latest) return false;
    return versions.every((v) => compareVersions(parseMinorVersion(v), latest) < 0);
  });
}

export function parseMinorVersion(versionString: string): VersionTuple {
  const [majorStr, minorStr] = versionString.split(".");
  const minor = minorStr === undefined || minorStr === "x" ? 99 : Number(minorStr);
  return [Number(majorStr), minor];
}

function compareVersions(a: VersionTuple, b: VersionTuple): number {
  return a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1];
}
