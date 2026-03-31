import type { Octokit } from "@octokit/rest";
import type { Repository } from "./repository.js";
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
  const [prCount, workflows] = await Promise.all([
    fetchPullRequestCount(client, login, repo.name),
    analyzeWorkflows(client, `${login}/${repo.name}`),
  ]);

  return {
    name: repo.name,
    url: repo.html_url,
    pullRequestsCount: prCount,
    languageVersions: workflows.languageVersions,
    noActionlint: workflows.noActionlint,
  };
}

async function fetchPullRequestCount(client: Octokit, owner: string, repo: string): Promise<number> {
  const pulls = await client.rest.pulls.list({ owner, repo, state: "open" });
  return pulls.data.length;
}
