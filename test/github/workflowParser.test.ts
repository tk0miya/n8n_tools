import { RequestError } from "@octokit/request-error";
import dedent from "dedent";
import { describe, expect, it, vi } from "vitest";
import { analyzeWorkflowFiles, fetchWorkflowFiles } from "@/github/workflowParser.js";

function encode(content: string): string {
  return Buffer.from(content).toString("base64");
}

describe("analyzeWorkflowFiles", () => {
  describe("hasWorkflows", () => {
    it("returns false when no workflow files exist", () => {
      expect(analyzeWorkflowFiles([]).hasWorkflows).toBe(false);
    });

    it("returns true when at least one workflow file exists", () => {
      expect(analyzeWorkflowFiles(["name: CI"]).hasWorkflows).toBe(true);
    });
  });

  describe("noActionlint", () => {
    it("returns false when no workflow files exist", () => {
      expect(analyzeWorkflowFiles([]).noActionlint).toBe(false);
    });

    it("returns false when workflow runs actionlint via run: step", () => {
      const workflow = dedent`
        jobs:
          lint:
            steps:
              - uses: actions/checkout@v4
              - run: actionlint
      `;
      expect(analyzeWorkflowFiles([workflow]).noActionlint).toBe(false);
    });

    it("returns false when workflow uses actionlint via uses: action", () => {
      const workflow = dedent`
        jobs:
          lint:
            steps:
              - uses: actions/checkout@v4
              - uses: rhysd/action-actionlint@v1
      `;
      expect(analyzeWorkflowFiles([workflow]).noActionlint).toBe(false);
    });

    it("returns true when workflow does not run actionlint", () => {
      const workflow = dedent`
        jobs:
          test:
            steps:
              - uses: actions/checkout@v4
              - run: bundle exec rspec
      `;
      expect(analyzeWorkflowFiles([workflow]).noActionlint).toBe(true);
    });

    it("returns false when actionlint is run in one of multiple workflow files", () => {
      const ciContent = dedent`
        jobs:
          test:
            steps:
              - run: bundle exec rspec
      `;
      const lintContent = dedent`
        jobs:
          lint:
            steps:
              - run: actionlint
      `;
      expect(analyzeWorkflowFiles([ciContent, lintContent]).noActionlint).toBe(false);
    });
  });

  describe("languageVersions", () => {
    it("returns an empty object when no workflow files exist", () => {
      expect(analyzeWorkflowFiles([]).languageVersions).toEqual({});
    });

    it("returns the ruby version for a simple ruby-version", () => {
      const workflow = dedent`
        jobs:
          test:
            steps:
              - uses: ruby/setup-ruby@v1
                with:
                  ruby-version: "3.2"
      `;
      expect(analyzeWorkflowFiles([workflow]).languageVersions).toEqual({ ruby: ["3.2"] });
    });

    it("resolves matrix build with custom key (not matching lang key)", () => {
      const workflow = dedent`
        jobs:
          build:
            strategy:
              matrix:
                ruby: ['3.4.3']
            steps:
              - uses: ruby/setup-ruby@v1
                with:
                  ruby-version: \${{ matrix.ruby }}
      `;
      expect(analyzeWorkflowFiles([workflow]).languageVersions).toEqual({ ruby: ["3.4.3"] });
    });

    it("returns all matrix versions for ruby-version", () => {
      const workflow = dedent`
        jobs:
          test:
            strategy:
              matrix:
                ruby-version: ['3.1', '3.2', '3.3']
            steps:
              - uses: ruby/setup-ruby@v1
                with:
                  ruby-version: \${{ matrix.ruby-version }}
      `;
      expect(analyzeWorkflowFiles([workflow]).languageVersions).toEqual({ ruby: ["3.1", "3.2", "3.3"] });
    });

    it("returns versions for multiple languages", () => {
      const workflow = dedent`
        jobs:
          test:
            steps:
              - uses: actions/setup-node@v3
                with:
                  node-version: "18"
              - uses: ruby/setup-ruby@v1
                with:
                  ruby-version: "3.2"
      `;
      expect(analyzeWorkflowFiles([workflow]).languageVersions).toEqual({ ruby: ["3.2"], node: ["18"] });
    });

    it("aggregates versions across multiple workflow files", () => {
      const ciContent = dedent`
        jobs:
          test:
            steps:
              - uses: ruby/setup-ruby@v1
                with:
                  ruby-version: "3.2"
      `;
      const deployContent = dedent`
        jobs:
          deploy:
            steps:
              - uses: ruby/setup-ruby@v1
                with:
                  ruby-version: "3.1"
              - uses: actions/setup-node@v3
                with:
                  node-version: "20"
      `;
      expect(analyzeWorkflowFiles([ciContent, deployContent]).languageVersions).toEqual({
        ruby: ["3.2", "3.1"],
        node: ["20"],
      });
    });

    it("deduplicates versions when same version appears in multiple files", () => {
      const content = dedent`
        jobs:
          test:
            steps:
              - uses: ruby/setup-ruby@v1
                with:
                  ruby-version: "3.2"
      `;
      expect(analyzeWorkflowFiles([content, content]).languageVersions).toEqual({ ruby: ["3.2"] });
    });

    it("returns an empty object when workflow has no language version settings", () => {
      const workflow = dedent`
        jobs:
          test:
            steps:
              - uses: actions/checkout@v4
              - run: echo "hello"
      `;
      expect(analyzeWorkflowFiles([workflow]).languageVersions).toEqual({});
    });

    it("returns an empty object for invalid YAML", () => {
      expect(analyzeWorkflowFiles(["}{invalid"]).languageVersions).toEqual({});
    });

    it("returns an empty object for YAML without jobs", () => {
      expect(analyzeWorkflowFiles(["name: CI"]).languageVersions).toEqual({});
    });
  });
});

describe("fetchWorkflowFiles", () => {
  function buildClient(getContent: ReturnType<typeof vi.fn>) {
    return { rest: { repos: { getContent } } } as never;
  }

  it("returns empty array when .github/workflows/ does not exist (404)", async () => {
    const getContent = vi
      .fn()
      .mockRejectedValue(new RequestError("Not Found", 404, { request: { method: "GET", url: "", headers: {} } }));
    const files = await fetchWorkflowFiles(buildClient(getContent), "testuser/repo1");
    expect(files).toEqual([]);
  });

  it("returns empty array when access is forbidden (403)", async () => {
    const getContent = vi.fn().mockRejectedValue(
      new RequestError("Resource not accessible by personal access token", 403, {
        request: { method: "GET", url: "", headers: {} },
      }),
    );
    const files = await fetchWorkflowFiles(buildClient(getContent), "testuser/repo1");
    expect(files).toEqual([]);
  });

  it("returns empty array when directory is empty", async () => {
    const getContent = vi.fn().mockResolvedValue({ data: [] });
    const files = await fetchWorkflowFiles(buildClient(getContent), "testuser/repo1");
    expect(files).toEqual([]);
  });

  it("skips non-yml files", async () => {
    const getContent = vi.fn().mockResolvedValue({
      data: [{ name: "README.md", path: ".github/workflows/README.md" }],
    });
    const files = await fetchWorkflowFiles(buildClient(getContent), "testuser/repo1");
    expect(files).toEqual([]);
    expect(getContent).toHaveBeenCalledTimes(1);
  });

  it("fetches and decodes yml files", async () => {
    const content = "name: CI\n";
    const getContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
      if (path === ".github/workflows") {
        return { data: [{ name: "ci.yml", path: ".github/workflows/ci.yml" }] };
      }
      return { data: { content: encode(content) } };
    });
    const files = await fetchWorkflowFiles(buildClient(getContent), "testuser/repo1");
    expect(files).toEqual([content]);
  });
});
