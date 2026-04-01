import type { Octokit } from "@octokit/rest";

// ── Public API ──────────────────────────────────────────────

export async function fetchTokenExpiry(client: Octokit): Promise<Date | null> {
  const response = await client.rest.users.getAuthenticated();
  const expirationHeader = response.headers["github-authentication-token-expiration"] as string | undefined;

  if (!expirationHeader) {
    return null;
  }

  return parseExpirationHeader(expirationHeader);
}

// ── Parsing ─────────────────────────────────────────────────

export function parseExpirationHeader(header: string): Date {
  // Format: "2024-06-01 00:00:00 UTC" or "2027-03-31 00:00:00 +0900"
  const normalized = header
    .replace(" UTC", "Z")
    .replace(/ ([+-]\d{4})$/, "$1")
    .replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Failed to parse token expiration header: ${header}`);
  }
  return date;
}
