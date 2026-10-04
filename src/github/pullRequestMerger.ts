import type { Octokit } from "@octokit/rest";

export type MergeableState = "MERGEABLE" | "CONFLICTING" | "UNKNOWN";
export type StatusState = "SUCCESS" | "PENDING" | "FAILURE" | "ERROR" | "EXPECTED";

export interface MergeCandidate {
  repo: string;
  number: number;
  title: string;
  url: string;
  isDraft: boolean;
  mergeable: MergeableState;
  headRefOid: string;
  statusState: StatusState | null;
}

const SEARCH_QUERY = `
  query($q: String!) {
    search(query: $q, type: ISSUE, first: 100) {
      nodes {
        ... on PullRequest {
          number
          title
          url
          isDraft
          mergeable
          headRefOid
          repository { nameWithOwner }
          commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
        }
      }
    }
  }
`;

interface SearchResponse {
  search: {
    nodes: {
      number: number;
      title: string;
      url: string;
      isDraft: boolean;
      mergeable: MergeableState;
      headRefOid: string;
      repository: { nameWithOwner: string };
      commits: { nodes: { commit: { statusCheckRollup: { state: StatusState } | null } }[] };
    }[];
  };
}

export async function searchPullRequests(client: Octokit, query: string): Promise<MergeCandidate[]> {
  const response = await client.graphql<SearchResponse>(SEARCH_QUERY, { q: query });
  return response.search.nodes.map((pr) => ({
    repo: pr.repository.nameWithOwner,
    number: pr.number,
    title: pr.title,
    url: pr.url,
    isDraft: pr.isDraft,
    mergeable: pr.mergeable,
    headRefOid: pr.headRefOid,
    statusState: pr.commits.nodes[0]?.commit.statusCheckRollup?.state ?? null,
  }));
}

export async function mergePullRequest(client: Octokit, pr: MergeCandidate): Promise<void> {
  const [owner, repo] = pr.repo.split("/");
  // Pin the merge to the verified commit so a newly pushed (untested) commit is never merged
  await client.rest.pulls.merge({ owner, repo, pull_number: pr.number, sha: pr.headRefOid });
}
