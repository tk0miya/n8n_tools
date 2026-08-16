import { parseArgs as nodeParseArgs } from "node:util";
import { getDefaultStatePath, loadState, STATE_VERSION, saveState } from "./state.js";

const TARGET_URL = "https://trafficnews.jp/category/road/page/1";
// An article trimmed out of the state while still on page 1 gets notified again,
// so the limit has to stay well above one page worth of articles.
export const MAX_SEEN_URLS = 300;

// One article is linked as /post/141234, /post/141234/, /post/141234/2 (paged
// articles) and with tracking queries; reduce every form to the post id.
const POST_URL_PATTERN = /^(?:https?:)?(?:\/\/trafficnews\.jp)?\/post\/(\d+)/i;

const ARCHIVE_SECTION_OPEN = /<section\b[^>]*\bclass="[^"]*section-archive-list[^"]*"[^>]*>/i;
// A source string because the depth scan drives it with exec() and a shared
// global regexp would leak its lastIndex.
const SECTION_TAG_SOURCE = "<section\\b[^>]*>|</section\\s*>";

const LINK_PATTERN = /<a\b[^>]*\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
const HEADING_PATTERN = /<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]\s*>/gi;
const FIRST_HEADING_PATTERN = /<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]\s*>/i;

export interface RunOptions {
  statePath: string;
  seed: boolean;
}

export interface ArticleEntry {
  title: string;
  url: string;
}

export interface RunOutput {
  checked_at: string;
  articles: ArticleEntry[];
}

export function parseArgs(argv: string[]): RunOptions {
  const { values } = nodeParseArgs({
    args: argv.slice(2),
    options: {
      state: { type: "string" },
      seed: { type: "boolean" },
    },
    allowPositionals: false,
  });

  return {
    statePath: values.state ?? process.env.TRAFFICNEWS_STATE_FILE ?? getDefaultStatePath(),
    seed: values.seed ?? false,
  };
}

function stripTags(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeArticleUrl(href: string): string | null {
  const match = POST_URL_PATTERN.exec(href);
  return match ? `https://trafficnews.jp/post/${match[1]}` : null;
}

export function normalizeSeenUrls(urls: readonly string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const url of urls) {
    // Keep unrecognized entries as-is; dropping them would re-notify those articles.
    const canonical = normalizeArticleUrl(url) ?? url;
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    normalized.push(canonical);
  }
  return normalized;
}

/**
 * Returns the inner HTML of <section class="section-archive-list">, or null if
 * absent. Cards are nested <section>s, so the closing tag is found by counting
 * depth; comments and scripts are dropped first to keep that count honest.
 */
export function extractArchiveSection(rawHtml: string): string | null {
  const html = rawHtml
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript\s*>/gi, "");

  const open = ARCHIVE_SECTION_OPEN.exec(html);
  if (!open) return null;

  const start = open.index + open[0].length;
  const scanner = new RegExp(SECTION_TAG_SOURCE, "gi");
  scanner.lastIndex = start;

  let depth = 1;
  let tag: RegExpExecArray | null = scanner.exec(html);
  while (tag !== null) {
    depth += tag[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return html.slice(start, tag.index);
    tag = scanner.exec(html);
  }

  // Unbalanced tags: treat it the same as a missing section.
  return null;
}

export function extractArticles(html: string): ArticleEntry[] {
  const section = extractArchiveSection(html);
  if (section === null) {
    // Falling back to the whole page would notify sidebar articles from other
    // categories, so fail loudly instead.
    throw new Error(
      'archive list (<section class="section-archive-list">) not found; the page layout may have changed',
    );
  }

  // A card links the same article from its thumbnail, its heading and often a
  // "read more" link. The headline is whichever of them involves a heading.
  const headings = [...section.matchAll(HEADING_PATTERN)].map(
    (match) => [match.index, match.index + match[0].length] as const,
  );
  const enclosedByHeading = (at: number) => headings.some(([start, end]) => at >= start && at < end);

  const byUrl = new Map<string, ArticleEntry & { headline: boolean }>();
  for (const match of section.matchAll(LINK_PATTERN)) {
    const url = normalizeArticleUrl(match[1]);
    if (url === null) continue;

    // A card-wide link swallows the lead text and the date, so take the heading
    // it wraps rather than the whole anchor.
    const wrapped = FIRST_HEADING_PATTERN.exec(match[2]);
    const headline = wrapped !== null || enclosedByHeading(match.index);
    const title = stripTags(wrapped ? wrapped[0] : match[2]);
    if (!title) continue; // thumbnail links carry no text of their own

    const existing = byUrl.get(url);
    if (existing && (existing.headline || !headline)) continue;
    byUrl.set(url, { title, url, headline });
  }

  return [...byUrl.values()].map(({ title, url }) => ({ title, url }));
}

export async function fetchArticles(url: string = TARGET_URL): Promise<ArticleEntry[]> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; trafficnews-checker/1.0)",
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} fetching ${url}`);
  }
  const html = await response.text();
  const articles = extractArticles(html);
  if (articles.length === 0) {
    throw new Error(`no articles found at ${url}; the page layout may have changed`);
  }
  return articles;
}

export function filterNewArticles(articles: ArticleEntry[], seenUrls: ReadonlySet<string>): ArticleEntry[] {
  return articles.filter((a) => !seenUrls.has(a.url));
}

export function rotateSeenUrls(urls: string[], max: number = MAX_SEEN_URLS): string[] {
  return urls.length > max ? urls.slice(-max) : urls;
}

export async function run(options: RunOptions): Promise<number> {
  const state = await loadState(options.statePath);
  const knownUrls = normalizeSeenUrls(state.seenUrls);
  const seenUrls = new Set(knownUrls);

  const allArticles = await fetchArticles();

  // With no usable state the whole page looks new, so record it silently rather
  // than flooding the channel with a page of old articles.
  const seeding = options.seed || seenUrls.size === 0;
  if (seeding) {
    console.warn(`[trafficnews] seeding state with ${allArticles.length} articles; no articles reported`);
  }

  const output: RunOutput = {
    checked_at: new Date().toISOString(),
    articles: seeding ? [] : filterNewArticles(allArticles, seenUrls),
  };
  console.log(JSON.stringify(output, null, 2));

  // Append oldest first so the newest articles are the last to be trimmed away.
  const nextSeenUrls = [...knownUrls];
  for (const article of [...allArticles].reverse()) {
    if (seenUrls.has(article.url)) continue;
    seenUrls.add(article.url);
    nextSeenUrls.push(article.url);
  }
  await saveState({ version: STATE_VERSION, seenUrls: rotateSeenUrls(nextSeenUrls) }, options.statePath);

  return 0;
}
