import { parseArgs as nodeParseArgs } from "node:util";
import type { MergeCandidate } from "../github/pullRequestMerger.ts";
import { mergePullRequest, searchPullRequests } from "../github/pullRequestMerger.ts";

const LABEL = "auto-label";
const REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/;

// ── Public API ──────────────────────────────────────────────

export type SkipReason = "draft" | "conflict" | "mergeable_pending" | "no_checks" | "ci_pending" | "ci_failure";

export interface PullRequestSummary {
  repo: string;
  number: number;
  title: string;
  url: string;
}

export interface MergeResult {
  merged: PullRequestSummary[];
  skipped: (PullRequestSummary & { reason: SkipReason })[];
  failed: (PullRequestSummary & { error: string })[];
}

export interface RunOptions {
  repos: readonly string[];
}

export function parseArgs(argv: string[]): RunOptions {
  const { positionals } = nodeParseArgs({
    args: argv.slice(2),
    options: {},
    allowPositionals: true,
  });

  if (positionals.length === 0) {
    throw new Error("Usage: ghmerge <owner/name> [<owner/name> ...]");
  }
  const invalid = positionals.filter((repo) => !REPO_PATTERN.test(repo));
  if (invalid.length > 0) {
    throw new Error(`Invalid repository name: ${invalid.join(", ")} (expected owner/name)`);
  }

  return { repos: positionals };
}

export async function run({ repos }: RunOptions): Promise<void> {
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

  const candidates = await searchPullRequests(client, buildSearchQuery(repos));
  const result: MergeResult = { merged: [], skipped: [], failed: [] };

  for (const pr of candidates) {
    const summary = toSummary(pr);
    const reason = classifyPullRequest(pr);
    if (reason) {
      result.skipped.push({ ...summary, reason });
      continue;
    }

    try {
      await mergePullRequest(client, pr);
      result.merged.push(summary);
    } catch (error: unknown) {
      result.failed.push({ ...summary, error: error instanceof Error ? error.message : String(error) });
    }
  }

  console.log(JSON.stringify(result));
}

// ── Token handling ──────────────────────────────────────────

function requireToken(): string {
  const token = process.env.GHMERGE_GITHUB_TOKEN;
  if (!token) {
    console.error("Error: GHMERGE_GITHUB_TOKEN environment variable is not set");
    process.exit(1);
  }
  return token;
}

// ── Query construction ─────────────────────────────────────

export function buildSearchQuery(repos: readonly string[]): string {
  return ["is:pr", "is:open", `label:${LABEL}`, ...repos.map((repo) => `repo:${repo}`)].join(" ");
}

// ── Classification ─────────────────────────────────────────

// Returns the reason to skip, or null when the pull request is safe to merge
export function classifyPullRequest(pr: MergeCandidate): SkipReason | null {
  if (pr.isDraft) return "draft";
  if (pr.mergeable === "CONFLICTING") return "conflict";
  if (pr.mergeable !== "MERGEABLE") return "mergeable_pending";
  if (pr.statusState === null) return "no_checks";
  if (pr.statusState === "PENDING" || pr.statusState === "EXPECTED") return "ci_pending";
  if (pr.statusState !== "SUCCESS") return "ci_failure";
  return null;
}

function toSummary(pr: MergeCandidate): PullRequestSummary {
  return { repo: pr.repo, number: pr.number, title: pr.title, url: pr.url };
}
