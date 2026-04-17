import { parseArgs as nodeParseArgs } from "node:util";
import { getDefaultStatePath, loadState, STATE_VERSION, saveState } from "./state.js";

const TARGET_URL = "https://trafficnews.jp/category/road/page/1";
export const MAX_SEEN_URLS = 50;

export interface RunOptions {
  statePath: string;
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
    },
    allowPositionals: false,
  });

  return {
    statePath: values.state ?? process.env.TRAFFICNEWS_STATE_FILE ?? getDefaultStatePath(),
  };
}

export function extractArticles(html: string): ArticleEntry[] {
  const seen = new Set<string>();
  const articles: ArticleEntry[] = [];

  // Match <a href="https://trafficnews.jp/post/NNNNN">...</a> inside heading-like contexts.
  // Two passes: first look for headings containing links, then fall back to any post links.
  const headingPattern =
    /<h[1-6][^>]*>[\s\S]*?<a[^>]+href="(https:\/\/trafficnews\.jp\/post\/[^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h[1-6]>/gi;
  for (const match of html.matchAll(headingPattern)) {
    const url = match[1];
    const rawTitle = match[2]
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (url && rawTitle && !seen.has(url)) {
      seen.add(url);
      articles.push({ title: rawTitle, url });
    }
  }

  // Fallback: any post links with non-empty anchor text not already captured
  if (articles.length === 0) {
    const linkPattern = /<a[^>]+href="(https:\/\/trafficnews\.jp\/post\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    for (const match of html.matchAll(linkPattern)) {
      const url = match[1];
      const rawTitle = match[2]
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (url && rawTitle && !seen.has(url)) {
        seen.add(url);
        articles.push({ title: rawTitle, url });
      }
    }
  }

  return articles;
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
  return extractArticles(html);
}

export function filterNewArticles(articles: ArticleEntry[], seenUrls: ReadonlySet<string>): ArticleEntry[] {
  return articles.filter((a) => !seenUrls.has(a.url));
}

export function rotateSeenUrls(urls: string[], max: number = MAX_SEEN_URLS): string[] {
  return urls.length > max ? urls.slice(-max) : urls;
}

export async function run(options: RunOptions): Promise<number> {
  const state = await loadState(options.statePath);
  const seenUrls = new Set(state.seenUrls);

  const allArticles = await fetchArticles();
  const newArticles = filterNewArticles(allArticles, seenUrls);

  const output: RunOutput = {
    checked_at: new Date().toISOString(),
    articles: newArticles,
  };
  console.log(JSON.stringify(output, null, 2));

  const nextSeenUrls = [...state.seenUrls];
  for (const article of allArticles) {
    if (!seenUrls.has(article.url)) {
      nextSeenUrls.push(article.url);
    }
  }
  await saveState({ version: STATE_VERSION, seenUrls: rotateSeenUrls(nextSeenUrls) }, options.statePath);

  return 0;
}
