import { RequestError } from "@octokit/request-error";
import { describe, expect, it, vi } from "vitest";
import { fetchFileContent } from "@/github/content.js";

function encode(content: string): string {
  return Buffer.from(content).toString("base64");
}

function buildClient(getContent: ReturnType<typeof vi.fn>) {
  return { rest: { repos: { getContent } } } as never;
}

function requestError(status: number): RequestError {
  return new RequestError("error", status, { request: { method: "GET", url: "", headers: {} } });
}

describe("fetchFileContent", () => {
  it("returns null when the file does not exist (404)", async () => {
    const getContent = vi.fn().mockRejectedValue(requestError(404));
    expect(await fetchFileContent(buildClient(getContent), "testuser", "repo1", ".npmrc")).toBeNull();
  });

  it("returns null when access is forbidden (403)", async () => {
    const getContent = vi.fn().mockRejectedValue(requestError(403));
    expect(await fetchFileContent(buildClient(getContent), "testuser", "repo1", ".npmrc")).toBeNull();
  });

  it("returns null when the response is a directory listing", async () => {
    const getContent = vi.fn().mockResolvedValue({ data: [] });
    expect(await fetchFileContent(buildClient(getContent), "testuser", "repo1", ".npmrc")).toBeNull();
  });

  it("fetches and decodes the file content", async () => {
    const content = "min-release-age=7\n";
    const getContent = vi.fn().mockResolvedValue({ data: { content: encode(content) } });
    const result = await fetchFileContent(buildClient(getContent), "testuser", "repo1", ".npmrc");
    expect(result).toBe(content);
    expect(getContent).toHaveBeenCalledWith({ owner: "testuser", repo: "repo1", path: ".npmrc" });
  });

  it("rethrows unexpected errors", async () => {
    const getContent = vi.fn().mockRejectedValue(requestError(500));
    await expect(fetchFileContent(buildClient(getContent), "testuser", "repo1", ".npmrc")).rejects.toThrow();
  });
});
