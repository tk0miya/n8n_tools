import { RequestError } from "@octokit/request-error";
import type { Octokit } from "@octokit/rest";

/**
 * Fetch a single file's decoded text content from a repository.
 * Returns null when the file is missing or inaccessible (403/404).
 */
export async function fetchFileContent(
  client: Octokit,
  owner: string,
  repo: string,
  path: string,
): Promise<string | null> {
  try {
    const { data } = await client.rest.repos.getContent({ owner, repo, path });
    if (!Array.isArray(data) && "content" in data && data.content) {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
  } catch (error: unknown) {
    if (error instanceof RequestError && (error.status === 403 || error.status === 404)) {
      return null;
    }
    throw error;
  }
  return null;
}
