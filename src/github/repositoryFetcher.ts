import { RequestError } from "@octokit/request-error";
import type { Octokit } from "@octokit/rest";
import { analyzeDependabot } from "./dependabotParser.js";
import type { PullRequest, Repository } from "./repository.js";
import { analyzeWorkflows } from "./workflowParser.js";

type OctokitRepo = Awaited<ReturnType<Octokit["rest"]["repos"]["listForAuthenticatedUser"]>>["data"][number];

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export interface FetchOptions {
  debug?: boolean;
  labels?: readonly string[];
}

export function isActiveRepo(repo: OctokitRepo): boolean {
  return !repo.archived && !repo.fork && new Date(repo.pushed_at ?? 0).getTime() > Date.now() - ONE_YEAR_MS;
}

export async function fetchRepositories(
  client: Octokit,
  { debug = false, labels = [] }: FetchOptions = {},
): Promise<Repository[]> {
  const login = await getLogin(client);
  const allRepos = await client.paginate(client.rest.repos.listForAuthenticatedUser, { type: "owner" });
  if (debug) console.warn(`[debug] Found ${allRepos.length} repositories`);

  const activeRepos = allRepos.filter(isActiveRepo);
  if (debug) console.warn(`[debug] ${activeRepos.length} repositories after filtering`);

  return Promise.all(
    activeRepos.map((repo, i) => {
      if (debug) console.warn(`[debug] Processing ${repo.name} (${i + 1}/${activeRepos.length})`);
      return buildRepository(client, login, repo, labels);
    }),
  );
}

async function getLogin(client: Octokit): Promise<string> {
  const { data: user } = await client.rest.users.getAuthenticated();
  return user.login;
}

async function buildRepository(
  client: Octokit,
  login: string,
  repo: OctokitRepo,
  labels: readonly string[],
): Promise<Repository> {
  const [pullRequests, workflows, dependabot] = await Promise.all([
    fetchPullRequests(client, login, repo.name, labels),
    analyzeWorkflows(client, `${login}/${repo.name}`),
    analyzeDependabot(client, `${login}/${repo.name}`),
  ]);

  return {
    name: repo.name,
    url: repo.html_url,
    pullRequests,
    languageVersions: workflows.languageVersions,
    noActionlint: workflows.noActionlint,
    noDependabot: dependabot.noDependabot,
    noDependabotCooldown: dependabot.noDependabotCooldown,
  };
}

async function fetchPullRequests(
  client: Octokit,
  owner: string,
  repo: string,
  labels: readonly string[],
): Promise<PullRequest[]> {
  try {
    const pulls = await client.rest.pulls.list({ owner, repo, state: "open" });
    const all = pulls.data.map((pr) => ({
      title: pr.title,
      url: pr.html_url,
      labels: pr.labels.map((l) => l.name),
    }));
    return labels.length === 0 ? all : all.filter((pr) => labels.every((l) => pr.labels.includes(l)));
  } catch (error: unknown) {
    if (error instanceof RequestError && (error.status === 403 || error.status === 404)) {
      return [];
    }
    throw error;
  }
}
