export interface PullRequest {
  title: string;
  url: string;
}

export interface Repository {
  name: string;
  url: string;
  pullRequests: PullRequest[];
  languageVersions: Record<string, string[]>;
  noActionlint: boolean;
}
