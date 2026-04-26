import { RequestError } from "@octokit/request-error";
import type { Octokit } from "@octokit/rest";
import yaml from "js-yaml";

const DEPENDABOT_PATHS = [".github/dependabot.yml", ".github/dependabot.yaml"] as const;

export interface DependabotAnalysis {
  noDependabot: boolean;
  noDependabotCooldown: boolean;
}

export async function analyzeDependabot(client: Octokit, repoFullName: string): Promise<DependabotAnalysis> {
  const content = await fetchDependabotFile(client, repoFullName);
  return analyzeDependabotFile(content);
}

export function analyzeDependabotFile(content: string | null): DependabotAnalysis {
  if (content === null) {
    return { noDependabot: true, noDependabotCooldown: false };
  }
  return { noDependabot: false, noDependabotCooldown: !hasCooldownOnAllUpdates(content) };
}

export async function fetchDependabotFile(client: Octokit, repoFullName: string): Promise<string | null> {
  const [owner, repo] = repoFullName.split("/");
  for (const path of DEPENDABOT_PATHS) {
    try {
      const { data } = await client.rest.repos.getContent({ owner, repo, path });
      if (!Array.isArray(data) && "content" in data && data.content) {
        return Buffer.from(data.content, "base64").toString("utf-8");
      }
    } catch (error: unknown) {
      if (error instanceof RequestError && (error.status === 403 || error.status === 404)) {
        continue;
      }
      throw error;
    }
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseYaml(content: string): unknown {
  try {
    return yaml.load(content);
  } catch {
    return null;
  }
}

function hasCooldownOnAllUpdates(content: string): boolean {
  const config = parseYaml(content);
  if (!isRecord(config)) return false;

  const updates = config.updates;
  if (!Array.isArray(updates) || updates.length === 0) return false;

  return updates.every((update) => isRecord(update) && isRecord(update.cooldown));
}
