import { parseArgs as nodeParseArgs } from "node:util";
import { fetchTokenExpiry } from "../github/tokenExpiry.ts";

// ── Public API ──────────────────────────────────────────────

export interface CheckTokenResult {
  expiration: string | null;
  daysUntilExpiry: number | null;
}

export interface RunOptions {
  tokenEnvName: string;
}

export function parseArgs(argv: string[]): RunOptions {
  const { positionals } = nodeParseArgs({
    args: argv.slice(2),
    options: {},
    allowPositionals: true,
  });

  if (positionals.length !== 1) {
    throw new Error("Usage: ghtoken <token environment variable name>");
  }

  return { tokenEnvName: positionals[0] };
}

export async function run({ tokenEnvName }: RunOptions): Promise<void> {
  const token = requireToken(tokenEnvName);
  const { Octokit } = await import("@octokit/rest");
  const client = new Octokit({
    auth: token,
    log: {
      debug: () => {},
      info: () => {},
      warn: console.warn,
      error: () => {},
    },
  });

  const expiration = await fetchTokenExpiry(client);
  const result = toCheckTokenResult(expiration);
  console.log(JSON.stringify(result));
}

// ── Result construction ─────────────────────────────────────

export function toCheckTokenResult(expiration: Date | null): CheckTokenResult {
  if (!expiration) {
    return { expiration: null, daysUntilExpiry: null };
  }

  return {
    expiration: expiration.toISOString(),
    daysUntilExpiry: computeDaysUntilExpiry(expiration),
  };
}

export function computeDaysUntilExpiry(expiration: Date, now: Date = new Date()): number {
  const diffMs = expiration.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ── Token handling ──────────────────────────────────────────

function requireToken(name: string): string {
  const token = process.env[name];
  if (!token) {
    console.error(`Error: ${name} environment variable is not set`);
    process.exit(1);
  }
  return token;
}
