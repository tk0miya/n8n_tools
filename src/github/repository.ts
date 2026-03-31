export interface Repository {
  name: string;
  url: string;
  pullRequestsCount: number;
  languageVersions: Record<string, string[]>;
  noActionlint: boolean;
}
