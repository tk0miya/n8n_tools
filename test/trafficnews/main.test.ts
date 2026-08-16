import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, aroundEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  extractArchiveSection,
  extractArticles,
  fetchArticles,
  filterNewArticles,
  MAX_SEEN_URLS,
  normalizeArticleUrl,
  normalizeSeenUrls,
  parseArgs,
  rotateSeenUrls,
  run,
} from "#trafficnews/main.js";
import { loadState } from "#trafficnews/state.js";

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

  it("defaults seed to false", () => {
    expect(parseArgs(makeArgv()).seed).toBe(false);
  });

  it("enables seed with --seed", () => {
    expect(parseArgs(makeArgv("--seed")).seed).toBe(true);
  });
});

// ── normalizeArticleUrl ───────────────────────────────────────

describe("normalizeArticleUrl", () => {
  it("keeps a canonical post URL unchanged", () => {
    expect(normalizeArticleUrl("https://trafficnews.jp/post/12345")).toBe("https://trafficnews.jp/post/12345");
  });

  it("strips a trailing slash", () => {
    expect(normalizeArticleUrl("https://trafficnews.jp/post/12345/")).toBe("https://trafficnews.jp/post/12345");
  });

  it("strips the page suffix of a paged article", () => {
    expect(normalizeArticleUrl("https://trafficnews.jp/post/12345/2")).toBe("https://trafficnews.jp/post/12345");
  });

  it("strips query strings and fragments", () => {
    expect(normalizeArticleUrl("https://trafficnews.jp/post/12345?utm_source=rss#comments")).toBe(
      "https://trafficnews.jp/post/12345",
    );
  });

  it("upgrades http to the canonical https form", () => {
    expect(normalizeArticleUrl("http://trafficnews.jp/post/12345")).toBe("https://trafficnews.jp/post/12345");
  });

  it("absolutizes relative and protocol-relative hrefs", () => {
    expect(normalizeArticleUrl("/post/12345")).toBe("https://trafficnews.jp/post/12345");
    expect(normalizeArticleUrl("//trafficnews.jp/post/12345")).toBe("https://trafficnews.jp/post/12345");
  });

  it("returns null for non-article URLs", () => {
    expect(normalizeArticleUrl("https://trafficnews.jp/category/road")).toBeNull();
    expect(normalizeArticleUrl("https://example.com/post/12345")).toBeNull();
    expect(normalizeArticleUrl("//example.com/post/12345")).toBeNull();
    expect(normalizeArticleUrl("/category/road")).toBeNull();
  });
});

// ── normalizeSeenUrls ─────────────────────────────────────────

describe("normalizeSeenUrls", () => {
  it("collapses URL variants of the same article into one entry", () => {
    const result = normalizeSeenUrls([
      "https://trafficnews.jp/post/12345/",
      "https://trafficnews.jp/post/12345",
      "https://trafficnews.jp/post/67890?utm_source=rss",
    ]);
    expect(result).toEqual(["https://trafficnews.jp/post/12345", "https://trafficnews.jp/post/67890"]);
  });

  it("keeps unrecognized entries so their articles are not re-notified", () => {
    expect(normalizeSeenUrls(["https://example.com/other"])).toEqual(["https://example.com/other"]);
  });

  it("preserves order", () => {
    const urls = ["https://trafficnews.jp/post/1", "https://trafficnews.jp/post/2", "https://trafficnews.jp/post/3"];
    expect(normalizeSeenUrls(urls)).toEqual(urls);
  });
});

// ── extractArchiveSection ─────────────────────────────────────

describe("extractArchiveSection", () => {
  it("returns the inner HTML of the archive list", () => {
    const html = `<section class="section-archive-list"><p>inner</p></section>`;
    expect(extractArchiveSection(html)).toBe("<p>inner</p>");
  });

  it("keeps nested <section> cards instead of stopping at the first </section>", () => {
    const html = `
      <section class="section-archive-list">
        <section class="card">one</section>
        <section class="card">two</section>
      </section>
      <aside>sidebar</aside>`;
    const section = extractArchiveSection(html);
    expect(section).toContain("one");
    expect(section).toContain("two");
    expect(section).not.toContain("sidebar");
  });

  it("ignores <section> tags mentioned in comments and scripts", () => {
    const html = `
      <section class="section-archive-list">
        <!-- <section class="ad"> -->
        <script>var tpl = "</section>";</script>
        <p>inner</p>
      </section>
      <aside>sidebar</aside>`;
    const section = extractArchiveSection(html);
    expect(section).toContain("inner");
    expect(section).not.toContain("sidebar");
  });

  it("returns null when the section is never closed", () => {
    const html = `<section class="section-archive-list"><p>inner</p>`;
    expect(extractArchiveSection(html)).toBeNull();
  });

  it("returns null when the archive list is absent", () => {
    expect(extractArchiveSection("<section class='other'></section>")).toBeNull();
  });
});

// ── extractArticles ───────────────────────────────────────────

describe("extractArticles", () => {
  it("extracts articles from heading-wrapped links", () => {
    const html = `
      <section class="section-archive-list">
        <h2 class="entry-title">
          <a href="https://trafficnews.jp/post/12345">道路工事のお知らせ</a>
        </h2>
        <h2 class="entry-title">
          <a href="https://trafficnews.jp/post/67890">新しい高速道路が開通</a>
        </h2>
      </section>
    `;
    const articles = extractArticles(html);
    expect(articles).toHaveLength(2);
    expect(articles[0]).toEqual({ title: "道路工事のお知らせ", url: "https://trafficnews.jp/post/12345" });
    expect(articles[1]).toEqual({ title: "新しい高速道路が開通", url: "https://trafficnews.jp/post/67890" });
  });

  it("extracts every card when each is wrapped in its own <section>", () => {
    const html = `
      <section class="section-archive-list">
        <section class="archive-item">
          <h3><a href="https://trafficnews.jp/post/11111">最新の記事</a></h3>
        </section>
        <section class="archive-item">
          <h3><a href="https://trafficnews.jp/post/22222">2番目の記事</a></h3>
        </section>
        <section class="archive-item">
          <h3><a href="https://trafficnews.jp/post/33333">3番目の記事</a></h3>
        </section>
      </section>
    `;
    expect(extractArticles(html).map((a) => a.url)).toEqual([
      "https://trafficnews.jp/post/11111",
      "https://trafficnews.jp/post/22222",
      "https://trafficnews.jp/post/33333",
    ]);
  });

  it('ignores articles outside <section class="section-archive-list"> (e.g. sidebar widgets)', () => {
    const html = `
      <section class="section-archive-list">
        <h2 class="entry-title">
          <a href="https://trafficnews.jp/post/11111">road記事</a>
        </h2>
      </section>
      <aside>
        <h2><a href="https://trafficnews.jp/post/99999">サイドバーの他カテゴリ記事</a></h2>
      </aside>
    `;
    const articles = extractArticles(html);
    expect(articles).toHaveLength(1);
    expect(articles[0].url).toBe("https://trafficnews.jp/post/11111");
  });

  it("reports a card only once when its thumbnail and heading link the same article", () => {
    const html = `
      <section class="section-archive-list">
        <section class="archive-item">
          <a class="thumb" href="https://trafficnews.jp/post/12345/"><img src="thumb.jpg" alt=""></a>
          <h3><a href="https://trafficnews.jp/post/12345">記事タイトル</a></h3>
          <a class="more" href="https://trafficnews.jp/post/12345?utm_source=list">続きを読む</a>
        </section>
      </section>
    `;
    const articles = extractArticles(html);
    expect(articles).toEqual([{ title: "記事タイトル", url: "https://trafficnews.jp/post/12345" }]);
  });

  it("prefers the heading over a longer link elsewhere on the card", () => {
    const html = `
      <section class="section-archive-list">
        <section class="archive-item">
          <h3><a href="https://trafficnews.jp/post/12345">記事タイトル</a></h3>
          <p class="lead"><a href="https://trafficnews.jp/post/12345">本文の冒頭がここに長々と入ります</a></p>
        </section>
      </section>
    `;
    expect(extractArticles(html)).toEqual([{ title: "記事タイトル", url: "https://trafficnews.jp/post/12345" }]);
  });

  it("uses the wrapped heading when a single link covers the whole card", () => {
    const html = `
      <section class="section-archive-list">
        <section class="archive-item">
          <a href="https://trafficnews.jp/post/12345">
            <div class="thumb"><img src="t.jpg" alt=""></div>
            <h3>記事タイトル</h3>
            <p class="lead">本文の冒頭がここに入ります</p>
            <time>2026-08-16</time>
          </a>
        </section>
      </section>
    `;
    expect(extractArticles(html)).toEqual([{ title: "記事タイトル", url: "https://trafficnews.jp/post/12345" }]);
  });

  it("prefers the heading over a link that precedes it on the card", () => {
    const html = `
      <section class="section-archive-list">
        <section class="archive-item">
          <a class="thumb" href="https://trafficnews.jp/post/12345"><img src="t.jpg" alt=""><span>道路</span></a>
          <h3><a href="https://trafficnews.jp/post/12345">記事タイトル</a></h3>
        </section>
      </section>
    `;
    expect(extractArticles(html)).toEqual([{ title: "記事タイトル", url: "https://trafficnews.jp/post/12345" }]);
  });

  it("deduplicates articles with the same URL", () => {
    const html = `
      <section class="section-archive-list">
        <h2><a href="https://trafficnews.jp/post/12345">タイトル</a></h2>
        <h2><a href="https://trafficnews.jp/post/12345">タイトル</a></h2>
      </section>
    `;
    expect(extractArticles(html)).toHaveLength(1);
  });

  it("extracts plain (non-heading) card links", () => {
    const html = `
      <section class="section-archive-list">
        <div class="card">
          <a href="https://trafficnews.jp/post/99999">記事タイトル</a>
        </div>
      </section>
    `;
    const articles = extractArticles(html);
    expect(articles).toEqual([{ title: "記事タイトル", url: "https://trafficnews.jp/post/99999" }]);
  });

  it("ignores links that are not post URLs", () => {
    const html = `
      <section class="section-archive-list">
        <h2><a href="https://trafficnews.jp/category/road">カテゴリ</a></h2>
        <h2><a href="https://example.com/post/12345">外部リンク</a></h2>
        <h2><a href="https://trafficnews.jp/post/11111">正しい記事</a></h2>
      </section>
    `;
    const articles = extractArticles(html);
    expect(articles).toHaveLength(1);
    expect(articles[0].url).toBe("https://trafficnews.jp/post/11111");
  });

  it("strips inner HTML tags from title", () => {
    const html = `
      <section class="section-archive-list">
        <h2><a href="https://trafficnews.jp/post/22222"><span>タグ付き</span>タイトル</a></h2>
      </section>
    `;
    expect(extractArticles(html)[0].title).toBe("タグ付きタイトル");
  });

  it("returns an empty array when the archive list holds no articles", () => {
    expect(extractArticles(`<section class="section-archive-list"><p>該当なし</p></section>`)).toEqual([]);
  });

  it("throws when the archive list is missing so a layout change is not silently ignored", () => {
    expect(() => extractArticles("<div>No archive list here</div>")).toThrow(/section-archive-list/);
  });
});

// ── fetchArticles ─────────────────────────────────────────────

describe("fetchArticles", () => {
  const htmlResponse = (body: string) => new Response(body, { status: 200, headers: { "content-type": "text/html" } });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the extracted articles", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        htmlResponse(
          `<section class="section-archive-list"><h2><a href="https://trafficnews.jp/post/1">A</a></h2></section>`,
        ),
      ),
    );
    await expect(fetchArticles()).resolves.toEqual([{ title: "A", url: "https://trafficnews.jp/post/1" }]);
  });

  it("throws on a non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 503, statusText: "Unavailable" })),
    );
    await expect(fetchArticles()).rejects.toThrow(/HTTP 503/);
  });

  it("throws when no article is found instead of reporting an empty page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => htmlResponse(`<section class="section-archive-list"></section>`)),
    );
    await expect(fetchArticles()).rejects.toThrow(/no articles found/);
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

// ── run ───────────────────────────────────────────────────────

describe("run", () => {
  let dir: string;
  let statePath: string;
  let logSpy: ReturnType<typeof vi.spyOn>;

  const page = (...ids: number[]) =>
    new Response(
      `<section class="section-archive-list">${ids
        .map(
          (id) => `<section class="card"><h3><a href="https://trafficnews.jp/post/${id}">記事${id}</a></h3></section>`,
        )
        .join("")}</section>`,
      { status: 200 },
    );

  const reportedUrls = (): string[] => {
    const printed = logSpy.mock.calls.at(-1)?.[0] as string;
    return JSON.parse(printed).articles.map((a: { url: string }) => a.url);
  };

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "trafficnews-run-"));
    statePath = join(dir, "state.json");
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    await rm(dir, { recursive: true, force: true });
  });

  it("reports nothing but records the page when the state file is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => page(3, 2, 1)),
    );
    await run({ statePath, seed: false });

    expect(reportedUrls()).toEqual([]);
    const state = await loadState(statePath);
    expect(state.seenUrls).toHaveLength(3);
  });

  it("reports only articles that are not in the state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => page(2, 1)),
    );
    await run({ statePath, seed: false });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => page(4, 3, 2, 1)),
    );
    await run({ statePath, seed: false });

    expect(reportedUrls()).toEqual(["https://trafficnews.jp/post/4", "https://trafficnews.jp/post/3"]);
  });

  it("reports nothing on a second run when the page is unchanged", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => page(2, 1)),
    );
    await run({ statePath, seed: false });
    await run({ statePath, seed: false });

    expect(reportedUrls()).toEqual([]);
  });

  it("does not re-report an article whose link gained a trailing slash", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => page(1)),
    );
    await run({ statePath, seed: false });

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            `<section class="section-archive-list"><h3><a href="https://trafficnews.jp/post/1/">記事1</a></h3></section>`,
            { status: 200 },
          ),
      ),
    );
    await run({ statePath, seed: false });

    expect(reportedUrls()).toEqual([]);
  });

  it("records the page without reporting when --seed is given", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => page(2, 1)),
    );
    await run({ statePath, seed: false });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => page(4, 3, 2, 1)),
    );
    await run({ statePath, seed: true });

    expect(reportedUrls()).toEqual([]);
    const state = await loadState(statePath);
    expect(state.seenUrls).toHaveLength(4);
  });

  it("keeps the newest articles when the state is trimmed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => page(2, 1)),
    );
    await run({ statePath, seed: false });

    // The whole page is new and exceeds the limit; the newest ids must survive.
    const ids = Array.from({ length: MAX_SEEN_URLS + 5 }, (_, i) => MAX_SEEN_URLS + 5 - i);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => page(...ids)),
    );
    await run({ statePath, seed: false });

    const state = await loadState(statePath);
    expect(state.seenUrls).toHaveLength(MAX_SEEN_URLS);
    for (const id of ids.slice(0, 5)) {
      expect(state.seenUrls).toContain(`https://trafficnews.jp/post/${id}`);
    }
  });

  it("leaves the state untouched when the fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => page(2, 1)),
    );
    await run({ statePath, seed: false });
    const before = await loadState(statePath);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("boom", { status: 500 })),
    );
    await expect(run({ statePath, seed: false })).rejects.toThrow(/HTTP 500/);

    expect(await loadState(statePath)).toEqual(before);
  });
});
