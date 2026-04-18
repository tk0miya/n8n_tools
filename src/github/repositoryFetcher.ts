import { RequestError } from "@octokit/request-error";
import type { Octokit } from "@octokit/rest";
import type { PullRequest, Repository } from "./repository.js";
import { analyzeWorkflows } from "./workflowParser.js";

type OctokitRepo = Awaited<ReturnType<Octokit["rest"]["repos"]["listForAuthenticatedUser"]>>["data"][number];

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export interface FetchOptions {
  debug?: boolean;
}

export function isActiveRepo(repo: OctokitRepo): boolean {
  return !repo.archived && !repo.fork && new Date(repo.pushed_at ?? 0).getTime() > Date.now() - ONE_YEAR_MS;
}

export async function fetchRepositories(client: Octokit, { debug = false }: FetchOptions = {}): Promise<Repository[]> {
  const login = await getLogin(client);
  const allRepos = await client.paginate(client.rest.repos.listForAuthenticatedUser, { type: "owner" });
  if (debug) console.warn(`[debug] Found ${allRepos.length} repositories`);

  const activeRepos = allRepos.filter(isActiveRepo);
  if (debug) console.warn(`[debug] ${activeRepos.length} repositories after filtering`);

  return Promise.all(
    activeRepos.map((repo, i) => {
      if (debug) console.warn(`[debug] Processing ${repo.name} (${i + 1}/${activeRepos.length})`);
      return buildRepository(client, login, repo);
    }),
  );
}

async function getLogin(client: Octokit): Promise<string> {
  const { data: user } = await client.rest.users.getAuthenticated();
  return user.login;
}

async function buildRepository(client: Octokit, login: string, repo: OctokitRepo): Promise<Repository> {
  const [pullRequests, workflows] = await Promise.all([
    fetchPullRequests(client, login, repo.name),
    analyzeWorkflows(client, `${login}/${repo.name}`),
  ]);

  return {
    name: repo.name,
    url: repo.html_url,
    pullRequests,
    languageVersions: workflows.languageVersions,
    noActionlint: workflows.noActionlint,
  };
}

async function fetchPullRequests(client: Octokit, owner: string, repo: string): Promise<PullRequest[]> {
  try {
    const pulls = await client.rest.pulls.list({ owner, repo, state: "open" });
    return pulls.data.map((pr) => ({ title: pr.title, url: pr.html_url }));
  } catch (error: unknown) {
    if (error instanceof RequestError && (error.status === 403 || error.status === 404)) {
      return [];
    }
    throw error;
  }
}
