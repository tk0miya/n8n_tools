import type { VersionTuple } from "../github/languageVersionFetcher.js";
import { fetchLatestLanguageVersions } from "../github/languageVersionFetcher.js";
import type { Repository } from "../github/repository.js";
import { fetchRepositories } from "../github/repositoryFetcher.js";

// ── Public API ──────────────────────────────────────────────

export interface ScanResult {
  name: string;
  url: string;
  pullRequestsCount: number;
  outdatedLanguages: string[];
  noActionlint: boolean;
}

export interface RunOptions {
  debug?: boolean;
}

export async function run({ debug = false }: RunOptions = {}): Promise<void> {
  const token = requireToken();
  const { Octokit } = await import("@octokit/rest");
  const client = new Octokit({
    auth: token,
    log: {
      debug: () => {},
      info: () => {},
      warn: console.warn,
      error: () => {},
    },
  });

  const [repositories, latestVersions] = await Promise.all([
    fetchRepositories(client, { debug }),
    fetchLatestLanguageVersions(client),
  ]);

  const results = repositories.map((repo) => toScanResult(repo, latestVersions));
  const filtered = filterScanResults(results);
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

// ── Transformation ─────────────────────────────────────────

export function toScanResult(repo: Repository, latestVersions: ReadonlyMap<string, VersionTuple>): ScanResult {
  return {
    name: repo.name,
    url: repo.url,
    pullRequestsCount: repo.pullRequestsCount,
    outdatedLanguages: detectOutdatedLanguages(repo, latestVersions),
    noActionlint: repo.noActionlint,
  };
}

// ── Filtering ───────────────────────────────────────────────

export function filterScanResults(results: readonly ScanResult[]): ScanResult[] {
  return results.filter(
    (result) => result.pullRequestsCount >= 1 || result.outdatedLanguages.length > 0 || result.noActionlint,
  );
}

// ── Version checking ───────────────────────────────────────

export function detectOutdatedLanguages(
  repo: Pick<Repository, "languageVersions">,
  latestVersions: ReadonlyMap<string, VersionTuple>,
): string[] {
  const result: string[] = [];
  for (const [lang, versions] of Object.entries(repo.languageVersions)) {
    const latest = latestVersions.get(lang);
    if (!latest) continue;
    if (versions.every((v) => compareVersions(parseMinorVersion(v), latest) < 0)) {
      result.push(lang);
    }
  }
  return result;
}

export function parseMinorVersion(versionString: string): VersionTuple {
  const [majorStr, minorStr] = versionString.split(".");
  const minor = minorStr === undefined || minorStr === "x" ? 99 : Number(minorStr);
  return [Number(majorStr), minor];
}

function compareVersions(a: VersionTuple, b: VersionTuple): number {
  return a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1];
}
