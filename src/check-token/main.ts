import { fetchTokenExpiry } from "../github/tokenExpiry.js";

// ── Public API ──────────────────────────────────────────────

export interface CheckTokenResult {
  expiration: string | null;
  daysUntilExpiry: number | null;
}

export async function run(): Promise<void> {
  const token = requireToken();
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

function requireToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("Error: GITHUB_TOKEN environment variable is not set");
    process.exit(1);
  }
  return token;
}
