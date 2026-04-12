import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";

export function getDefaultStatePath(): string {
  const xdgStateHome = process.env.XDG_STATE_HOME ?? join(homedir(), ".local", "state");
  return join(xdgStateHome, "twcheck", "state.json");
}
export const STATE_VERSION = 1;

export interface AccountState {
  lastSeenId: string | null;
  lastCheckedAt: string;
}

export interface TwcheckState {
  version: typeof STATE_VERSION;
  accounts: Record<string, AccountState>;
}

export interface AccountRunResult {
  username: string;
  status: "ok" | "baseline_established" | "error";
  newLastSeenId?: string | null;
}

export function emptyState(): TwcheckState {
  return { version: STATE_VERSION, accounts: {} };
}

export function resolveStatePath(path: string): string {
  return isAbsolute(path) ? path : resolve(process.cwd(), path);
}

export async function loadState(path: string = getDefaultStatePath()): Promise<TwcheckState> {
  const absolute = resolveStatePath(path);
  let raw: string;
  try {
    raw = await readFile(absolute, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return emptyState();
    }
    console.warn(`[twcheck] failed to read state at ${absolute}: ${(error as Error).message}`);
    return emptyState();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn(`[twcheck] state file is not valid JSON, starting fresh: ${(error as Error).message}`);
    return emptyState();
  }

  if (!isTwcheckState(parsed)) {
    console.warn("[twcheck] state file schema is invalid or version mismatch, starting fresh");
    return emptyState();
  }
  return parsed;
}

export async function saveState(state: TwcheckState, path: string = getDefaultStatePath()): Promise<void> {
  const absolute = resolveStatePath(path);
  const dir = dirname(absolute);
  await mkdir(dir, { recursive: true });

  const tmp = `${absolute}.tmp`;
  await writeFile(tmp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(tmp, absolute);
}

export function mergeStateAfterRun(
  state: TwcheckState,
  results: readonly AccountRunResult[],
  now: Date = new Date(),
): TwcheckState {
  const nowIso = now.toISOString();
  const accounts: Record<string, AccountState> = { ...state.accounts };

  for (const result of results) {
    if (result.status === "error") {
      continue;
    }
    const key = result.username.toLowerCase();
    const previous = accounts[key];
    accounts[key] = {
      lastSeenId: result.newLastSeenId ?? previous?.lastSeenId ?? null,
      lastCheckedAt: nowIso,
    };
  }

  return { version: STATE_VERSION, accounts };
}

export function getAccountState(state: TwcheckState, username: string): AccountState | undefined {
  return state.accounts[username.toLowerCase()];
}

function isTwcheckState(value: unknown): value is TwcheckState {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as { version?: unknown; accounts?: unknown };
  if (candidate.version !== STATE_VERSION) {
    return false;
  }
  if (typeof candidate.accounts !== "object" || candidate.accounts === null) {
    return false;
  }
  for (const entry of Object.values(candidate.accounts as Record<string, unknown>)) {
    if (typeof entry !== "object" || entry === null) {
      return false;
    }
    const acc = entry as { lastSeenId?: unknown; lastCheckedAt?: unknown };
    if (acc.lastSeenId !== null && typeof acc.lastSeenId !== "string") {
      return false;
    }
    if (typeof acc.lastCheckedAt !== "string") {
      return false;
    }
  }
  return true;
}
