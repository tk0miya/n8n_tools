import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";

export const STATE_VERSION = 1;

export interface TrafficNewsState {
  version: typeof STATE_VERSION;
  seenUrls: string[];
}

export function getDefaultStatePath(): string {
  const xdgStateHome = process.env.XDG_STATE_HOME ?? join(homedir(), ".local", "state");
  return join(xdgStateHome, "trafficnews", "state.json");
}

export function emptyState(): TrafficNewsState {
  return { version: STATE_VERSION, seenUrls: [] };
}

export function resolveStatePath(path: string): string {
  return isAbsolute(path) ? path : resolve(process.cwd(), path);
}

export async function loadState(path: string = getDefaultStatePath()): Promise<TrafficNewsState> {
  const absolute = resolveStatePath(path);
  let raw: string;
  try {
    raw = await readFile(absolute, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return emptyState();
    }
    console.warn(`[trafficnews] failed to read state at ${absolute}: ${(error as Error).message}`);
    return emptyState();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn(`[trafficnews] state file is not valid JSON, starting fresh: ${(error as Error).message}`);
    return emptyState();
  }

  if (!isTrafficNewsState(parsed)) {
    console.warn("[trafficnews] state file schema is invalid or version mismatch, starting fresh");
    return emptyState();
  }
  return parsed;
}

export async function saveState(state: TrafficNewsState, path: string = getDefaultStatePath()): Promise<void> {
  const absolute = resolveStatePath(path);
  const dir = dirname(absolute);
  await mkdir(dir, { recursive: true });

  const tmp = `${absolute}.tmp`;
  await writeFile(tmp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(tmp, absolute);
}

function isTrafficNewsState(value: unknown): value is TrafficNewsState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { version?: unknown; seenUrls?: unknown };
  if (candidate.version !== STATE_VERSION) return false;
  if (!Array.isArray(candidate.seenUrls)) return false;
  if (!candidate.seenUrls.every((u) => typeof u === "string")) return false;
  return true;
}
