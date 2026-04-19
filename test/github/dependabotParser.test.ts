import { RequestError } from "@octokit/request-error";
import dedent from "dedent";
import { describe, expect, it, vi } from "vitest";
import { analyzeDependabotFile, fetchDependabotFile } from "@/github/dependabotParser.js";

function encode(content: string): string {
  return Buffer.from(content).toString("base64");
}

describe("analyzeDependabotFile", () => {
  it("flags missing dependabot when content is null", () => {
    expect(analyzeDependabotFile(null)).toEqual({ noDependabot: true, noDependabotCooldown: false });
  });

  it("flags missing cooldown when no update has cooldown", () => {
    const content = dedent`
      version: 2
      updates:
        - package-ecosystem: "npm"
          directory: "/"
          schedule:
            interval: "weekly"
    `;
    expect(analyzeDependabotFile(content)).toEqual({ noDependabot: false, noDependabotCooldown: true });
  });

  it("passes both checks when every update has cooldown", () => {
    const content = dedent`
      version: 2
      updates:
        - package-ecosystem: "npm"
          directory: "/"
          schedule:
            interval: "weekly"
          cooldown:
            default-days: 5
        - package-ecosystem: "github-actions"
          directory: "/"
          schedule:
            interval: "weekly"
          cooldown:
            default-days: 7
    `;
    expect(analyzeDependabotFile(content)).toEqual({ noDependabot: false, noDependabotCooldown: false });
  });

  it("flags missing cooldown when any update is missing cooldown", () => {
    const content = dedent`
      version: 2
      updates:
        - package-ecosystem: "npm"
          directory: "/"
          schedule:
            interval: "weekly"
          cooldown:
            default-days: 5
        - package-ecosystem: "github-actions"
          directory: "/"
          schedule:
            interval: "weekly"
    `;
    expect(analyzeDependabotFile(content)).toEqual({ noDependabot: false, noDependabotCooldown: true });
  });

  it("flags missing cooldown for empty updates list", () => {
    const content = dedent`
      version: 2
      updates: []
    `;
    expect(analyzeDependabotFile(content)).toEqual({ noDependabot: false, noDependabotCooldown: true });
  });

  it("flags missing cooldown for invalid YAML", () => {
    expect(analyzeDependabotFile("}{invalid")).toEqual({ noDependabot: false, noDependabotCooldown: true });
  });

  it("flags missing cooldown when updates is not an array", () => {
    expect(analyzeDependabotFile("version: 2")).toEqual({ noDependabot: false, noDependabotCooldown: true });
  });
});

describe("fetchDependabotFile", () => {
  function buildClient(getContent: ReturnType<typeof vi.fn>) {
    return { rest: { repos: { getContent } } } as never;
  }

  function notFoundError(): RequestError {
    return new RequestError("Not Found", 404, { request: { method: "GET", url: "", headers: {} } });
  }

  it("returns null when dependabot file does not exist", async () => {
    const getContent = vi.fn().mockRejectedValue(notFoundError());
    const result = await fetchDependabotFile(buildClient(getContent), "testuser/repo1");
    expect(result).toBeNull();
  });

  it("returns null when access is forbidden", async () => {
    const getContent = vi
      .fn()
      .mockRejectedValue(new RequestError("Forbidden", 403, { request: { method: "GET", url: "", headers: {} } }));
    const result = await fetchDependabotFile(buildClient(getContent), "testuser/repo1");
    expect(result).toBeNull();
  });

  it("fetches and decodes dependabot.yml", async () => {
    const content = "version: 2\n";
    const getContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
      if (path === ".github/dependabot.yml") {
        return { data: { content: encode(content) } };
      }
      throw notFoundError();
    });
    const result = await fetchDependabotFile(buildClient(getContent), "testuser/repo1");
    expect(result).toBe(content);
  });

  it("falls back to dependabot.yaml when .yml is missing", async () => {
    const content = "version: 2\n";
    const getContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
      if (path === ".github/dependabot.yaml") {
        return { data: { content: encode(content) } };
      }
      throw notFoundError();
    });
    const result = await fetchDependabotFile(buildClient(getContent), "testuser/repo1");
    expect(result).toBe(content);
  });
});
