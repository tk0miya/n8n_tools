import type { Octokit } from "@octokit/rest";
import { fetchFileContent } from "./content.js";

const PACKAGE_JSON_PATH = "package.json";
const NPMRC_PATH = ".npmrc";
const GEMFILE_PATH = "Gemfile";

export interface PackageCooldownAnalysis {
  noPackageCooldown: boolean;
}

export interface CooldownSources {
  packageJson: string | null;
  npmrc: string | null;
  gemfile: string | null;
}

export async function analyzePackageCooldown(client: Octokit, repoFullName: string): Promise<PackageCooldownAnalysis> {
  const [owner, repo] = repoFullName.split("/");
  const [packageJson, npmrc, gemfile] = await Promise.all([
    fetchFileContent(client, owner, repo, PACKAGE_JSON_PATH),
    fetchFileContent(client, owner, repo, NPMRC_PATH),
    fetchFileContent(client, owner, repo, GEMFILE_PATH),
  ]);
  return analyzeCooldownSources({ packageJson, npmrc, gemfile });
}

export function analyzeCooldownSources({ packageJson, npmrc, gemfile }: CooldownSources): PackageCooldownAnalysis {
  const missing =
    (packageJson !== null && !hasNpmCooldown(npmrc)) || (gemfile !== null && !hasBundlerCooldown(gemfile));
  return { noPackageCooldown: missing };
}

function hasNpmCooldown(npmrc: string | null): boolean {
  if (npmrc === null) return false;
  return /^\s*min-release-age\s*=\s*[1-9]\d*/m.test(npmrc);
}

function hasBundlerCooldown(gemfile: string): boolean {
  return /\bcooldown:\s*[1-9]\d*/.test(gemfile);
}
