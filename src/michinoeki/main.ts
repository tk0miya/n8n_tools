import { parseArgs as nodeParseArgs } from "node:util";
import { getDefaultStatePath, loadState, STATE_VERSION, saveState } from "./state.js";

const TARGET_URL = "https://www.mlit.go.jp/road/Michi-no-Eki/topics.html";
const BASE_URL = "https://www.mlit.go.jp";
export const MAX_SEEN_URLS = 100;

// The topics list lives inside <div id="ad1408_topics">...</div> on topics.html.
const TOPICS_CONTAINER_ID = "ad1408_topics";
// Registration announcements always include "第N回登録" in their link text
// (e.g., "「道の駅」の第64回登録について"). This pattern excludes links that
// merely mention 登録 in a different context such as 登録・案内要綱 changes.
const REGISTRATION_PATTERN = /回\s*登録/;

export interface RunOptions {
  statePath: string;
}

export interface RunOutput {
  checked_at: string;
  urls: string[];
}

export function parseArgs(argv: string[]): RunOptions {
  const { values } = nodeParseArgs({
    args: argv.slice(2),
    options: {
      state: { type: "string" },
    },
    allowPositionals: false,
  });

  return {
    statePath: values.state ?? process.env.MICHINOEKI_STATE_FILE ?? getDefaultStatePath(),
  };
}

function absolutize(href: string): string {
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith("//")) return `https:${href}`;
  if (href.startsWith("/")) return `${BASE_URL}${href}`;
  return href;
}

function stripTags(raw: string): string {
  return raw.replace(/<[^>]+>/g, "");
}

// Extract the inner HTML of <div id="ad1408_topics">. The div contains only a
// <ul> so a simple non-greedy match to the first </div> is sufficient.
export function extractTopicsSection(html: string): string | null {
  const re = new RegExp(`<div\\b[^>]*\\bid="${TOPICS_CONTAINER_ID}"[^>]*>([\\s\\S]*?)</div>`, "i");
  const match = re.exec(html);
  return match ? match[1] : null;
}

export function extractUrls(html: string): string[] {
  const section = extractTopicsSection(html);
  if (section === null) {
    console.warn(`[michinoeki] #${TOPICS_CONTAINER_ID} not found; falling back to full page`);
  }
  const target = section ?? html;

  const seen = new Set<string>();
  const urls: string[] = [];

  const linkPattern = /<a\b[^>]*\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of target.matchAll(linkPattern)) {
    if (!REGISTRATION_PATTERN.test(stripTags(match[2]))) continue;

    const url = absolutize(match[1]);
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }

  return urls;
}

export async function fetchUrls(url: string = TARGET_URL): Promise<string[]> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; michinoeki-checker/1.0)",
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} fetching ${url}`);
  }
  const html = await response.text();
  return extractUrls(html);
}

export function filterNewUrls(urls: string[], seenUrls: ReadonlySet<string>): string[] {
  return urls.filter((u) => !seenUrls.has(u));
}

export function rotateSeenUrls(urls: string[], max: number = MAX_SEEN_URLS): string[] {
  return urls.length > max ? urls.slice(-max) : urls;
}

export async function run(options: RunOptions): Promise<number> {
  const state = await loadState(options.statePath);
  const seenUrls = new Set(state.seenUrls);

  const allUrls = await fetchUrls();
  const newUrls = filterNewUrls(allUrls, seenUrls);

  const output: RunOutput = {
    checked_at: new Date().toISOString(),
    urls: newUrls,
  };
  console.log(JSON.stringify(output, null, 2));

  const nextSeenUrls = [...state.seenUrls, ...newUrls];
  await saveState({ version: STATE_VERSION, seenUrls: rotateSeenUrls(nextSeenUrls) }, options.statePath);

  return 0;
}
