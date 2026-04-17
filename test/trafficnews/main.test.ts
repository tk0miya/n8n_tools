import { aroundEach, describe, expect, it } from "vitest";
import { extractArticles, filterNewArticles, MAX_SEEN_URLS, parseArgs, rotateSeenUrls } from "@/trafficnews/main.js";

// ── parseArgs ────────────────────────────────────────────────

describe("parseArgs", () => {
  const makeArgv = (...rest: string[]) => ["node", "cli.js", ...rest];

  aroundEach(async (test) => {
    const savedXdgStateHome = process.env.XDG_STATE_HOME;
    const savedStateFile = process.env.TRAFFICNEWS_STATE_FILE;
    process.env.XDG_STATE_HOME = "/xdg/state";
    delete process.env.TRAFFICNEWS_STATE_FILE;
    await test();
    if (savedXdgStateHome === undefined) delete process.env.XDG_STATE_HOME;
    else process.env.XDG_STATE_HOME = savedXdgStateHome;
    if (savedStateFile === undefined) delete process.env.TRAFFICNEWS_STATE_FILE;
    else process.env.TRAFFICNEWS_STATE_FILE = savedStateFile;
  });

  it("uses XDG default state path when no args given", () => {
    const options = parseArgs(makeArgv());
    expect(options.statePath).toBe("/xdg/state/trafficnews/state.json");
  });

  it("uses --state argument when provided", () => {
    const options = parseArgs(makeArgv("--state", "/tmp/custom.json"));
    expect(options.statePath).toBe("/tmp/custom.json");
  });

  it("uses TRAFFICNEWS_STATE_FILE env var when --state is not provided", () => {
    process.env.TRAFFICNEWS_STATE_FILE = "/env/state.json";
    const options = parseArgs(makeArgv());
    expect(options.statePath).toBe("/env/state.json");
  });

  it("--state argument takes precedence over TRAFFICNEWS_STATE_FILE env var", () => {
    process.env.TRAFFICNEWS_STATE_FILE = "/env/state.json";
    const options = parseArgs(makeArgv("--state", "/arg/state.json"));
    expect(options.statePath).toBe("/arg/state.json");
  });
});

// ── extractArticles ───────────────────────────────────────────

describe("extractArticles", () => {
  it("extracts articles from heading-wrapped links", () => {
    const html = `
      <h2 class="entry-title">
        <a href="https://trafficnews.jp/post/12345">道路工事のお知らせ</a>
      </h2>
      <h2 class="entry-title">
        <a href="https://trafficnews.jp/post/67890">新しい高速道路が開通</a>
      </h2>
    `;
    const articles = extractArticles(html);
    expect(articles).toHaveLength(2);
    expect(articles[0]).toEqual({ title: "道路工事のお知らせ", url: "https://trafficnews.jp/post/12345" });
    expect(articles[1]).toEqual({ title: "新しい高速道路が開通", url: "https://trafficnews.jp/post/67890" });
  });

  it("deduplicates articles with the same URL", () => {
    const html = `
      <h2><a href="https://trafficnews.jp/post/12345">タイトル</a></h2>
      <h2><a href="https://trafficnews.jp/post/12345">タイトル</a></h2>
    `;
    const articles = extractArticles(html);
    expect(articles).toHaveLength(1);
  });

  it("falls back to plain post links when no heading-wrapped links found", () => {
    const html = `
      <div class="card">
        <a href="https://trafficnews.jp/post/99999">記事タイトル</a>
      </div>
    `;
    const articles = extractArticles(html);
    expect(articles).toHaveLength(1);
    expect(articles[0]).toEqual({ title: "記事タイトル", url: "https://trafficnews.jp/post/99999" });
  });

  it("ignores links that are not post URLs", () => {
    const html = `
      <h2><a href="https://trafficnews.jp/category/road">カテゴリ</a></h2>
      <h2><a href="https://example.com/post/12345">外部リンク</a></h2>
      <h2><a href="https://trafficnews.jp/post/11111">正しい記事</a></h2>
    `;
    const articles = extractArticles(html);
    expect(articles).toHaveLength(1);
    expect(articles[0].url).toBe("https://trafficnews.jp/post/11111");
  });

  it("strips inner HTML tags from title", () => {
    const html = `
      <h2><a href="https://trafficnews.jp/post/22222"><span>タグ付き</span>タイトル</a></h2>
    `;
    const articles = extractArticles(html);
    expect(articles[0].title).toBe("タグ付きタイトル");
  });

  it("returns empty array for HTML with no post links", () => {
    const html = "<div>No articles here</div>";
    expect(extractArticles(html)).toEqual([]);
  });
});

// ── filterNewArticles ─────────────────────────────────────────

describe("filterNewArticles", () => {
  it("returns all articles when seenUrls is empty", () => {
    const articles = [
      { title: "A", url: "https://trafficnews.jp/post/1" },
      { title: "B", url: "https://trafficnews.jp/post/2" },
    ];
    expect(filterNewArticles(articles, new Set())).toEqual(articles);
  });

  it("excludes articles whose URLs are in seenUrls", () => {
    const articles = [
      { title: "A", url: "https://trafficnews.jp/post/1" },
      { title: "B", url: "https://trafficnews.jp/post/2" },
      { title: "C", url: "https://trafficnews.jp/post/3" },
    ];
    const seen = new Set(["https://trafficnews.jp/post/1", "https://trafficnews.jp/post/3"]);
    const result = filterNewArticles(articles, seen);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("https://trafficnews.jp/post/2");
  });

  it("returns empty array when all articles are already seen", () => {
    const articles = [{ title: "A", url: "https://trafficnews.jp/post/1" }];
    const seen = new Set(["https://trafficnews.jp/post/1"]);
    expect(filterNewArticles(articles, seen)).toEqual([]);
  });
});

// ── rotateSeenUrls ────────────────────────────────────────────

describe("rotateSeenUrls", () => {
  it("returns the array unchanged when under the limit", () => {
    const urls = ["url1", "url2", "url3"];
    expect(rotateSeenUrls(urls, 10)).toEqual(urls);
  });

  it("returns the array unchanged when exactly at the limit", () => {
    const urls = ["url1", "url2", "url3"];
    expect(rotateSeenUrls(urls, 3)).toEqual(urls);
  });

  it("trims oldest entries when over the limit", () => {
    const urls = ["old1", "old2", "keep1", "keep2", "keep3"];
    expect(rotateSeenUrls(urls, 3)).toEqual(["keep1", "keep2", "keep3"]);
  });

  it("uses MAX_SEEN_URLS as default limit", () => {
    const urls = Array.from({ length: MAX_SEEN_URLS + 10 }, (_, i) => `url${i}`);
    const result = rotateSeenUrls(urls);
    expect(result).toHaveLength(MAX_SEEN_URLS);
    expect(result[0]).toBe(`url10`);
  });

  it("returns empty array for empty input", () => {
    expect(rotateSeenUrls([], 10)).toEqual([]);
  });
});
