import { RequestError } from "@octokit/request-error";
import type { Octokit } from "@octokit/rest";
import yaml from "js-yaml";

const LANGUAGE_KEYS = {
  "ruby-version": "ruby",
  "node-version": "node",
  "python-version": "python",
} as const satisfies Record<string, string>;

const MATRIX_REF_PATTERN = /^\$\{\{\s*matrix\.([\w-]+)\s*\}\}$/;

export interface WorkflowAnalysis {
  languageVersions: Record<string, string[]>;
  noActionlint: boolean;
}

export async function analyzeWorkflows(client: Octokit, repoFullName: string): Promise<WorkflowAnalysis> {
  const files = await fetchWorkflowFiles(client, repoFullName);
  return analyzeWorkflowFiles(files);
}

export function analyzeWorkflowFiles(files: string[]): WorkflowAnalysis {
  return {
    languageVersions: extractAllLanguageVersions(files),
    noActionlint: files.length > 0 && files.every((f) => !/\bactionlint\b/.test(f)),
  };
}

export async function fetchWorkflowFiles(client: Octokit, repoFullName: string): Promise<string[]> {
  try {
    const [owner, repo] = repoFullName.split("/");
    const { data: entries } = await client.rest.repos.getContent({
      owner,
      repo,
      path: ".github/workflows",
    });

    if (!Array.isArray(entries)) {
      return [];
    }

    const results: string[] = [];
    for (const entry of entries) {
      if (!entry.name.endsWith(".yml") && !entry.name.endsWith(".yaml")) {
        continue;
      }
      const { data: file } = await client.rest.repos.getContent({
        owner,
        repo,
        path: entry.path,
      });
      if (!Array.isArray(file) && "content" in file && file.content) {
        results.push(Buffer.from(file.content, "base64").toString("utf-8"));
      }
    }
    return results;
  } catch (error: unknown) {
    if (error instanceof RequestError && (error.status === 403 || error.status === 404)) {
      return [];
    }
    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractAllLanguageVersions(files: string[]): Record<string, string[]> {
  const versions: Record<string, string[]> = {};
  for (const content of files) {
    for (const [lang, vals] of Object.entries(extractFromWorkflow(content))) {
      versions[lang] = (versions[lang] ?? []).concat(vals);
    }
  }
  for (const key of Object.keys(versions)) {
    versions[key] = [...new Set(versions[key])];
  }
  return versions;
}

export function extractFromWorkflow(content: string): Record<string, string[]> {
  const workflow = parseYaml(content);
  if (!isRecord(workflow)) return {};

  const jobs = workflow.jobs;
  if (!isRecord(jobs)) return {};

  const versions: Record<string, string[]> = {};
  for (const job of Object.values(jobs)) {
    if (!isRecord(job)) continue;
    const matrix = extractMatrix(job);
    for (const [lang, vals] of Object.entries(extractFromSteps(job.steps, matrix))) {
      versions[lang] = (versions[lang] ?? []).concat(vals);
    }
  }
  return versions;
}

function parseYaml(content: string): unknown {
  try {
    return yaml.load(content);
  } catch {
    return null;
  }
}

function extractMatrix(job: Record<string, unknown>): Record<string, string[]> {
  const strategy = job.strategy;
  if (!isRecord(strategy)) return {};

  const matrix = strategy.matrix;
  if (!isRecord(matrix)) return {};

  const result: Record<string, string[]> = {};
  for (const [key, values] of Object.entries(matrix)) {
    if (!Array.isArray(values)) continue;
    result[key] = values.map((v) => String(v));
  }
  return result;
}

function extractFromSteps(steps: unknown, matrix: Record<string, string[]>): Record<string, string[]> {
  if (!Array.isArray(steps)) return {};

  const versions: Record<string, string[]> = {};
  for (const step of steps) {
    for (const [lang, vals] of Object.entries(extractFromStep(step, matrix))) {
      versions[lang] = (versions[lang] ?? []).concat(vals);
    }
  }
  return versions;
}

function extractFromStep(step: unknown, matrix: Record<string, string[]>): Record<string, string[]> {
  if (!isRecord(step)) return {};
  const withObj = step.with;
  if (!isRecord(withObj)) return {};

  const versions: Record<string, string[]> = {};
  for (const [langKey, langName] of Object.entries(LANGUAGE_KEYS)) {
    const value = withObj[langKey];
    if (value === undefined || value === null) continue;

    versions[langName] = resolveValue(String(value), langKey, matrix);
  }
  return versions;
}

function resolveValue(value: string, langKey: string, matrix: Record<string, string[]>): string[] {
  const match = MATRIX_REF_PATTERN.exec(value);
  if (match) {
    const matrixKey = match[1] || langKey;
    return matrix[matrixKey] || [];
  }
  return [value];
}
