import { aroundEach, describe, expect, it, vi } from "vitest";
import {
  extractTopicsSection,
  extractUrls,
  filterNewUrls,
  MAX_SEEN_URLS,
  parseArgs,
  rotateSeenUrls,
} from "@/michinoeki/main.js";

// ── parseArgs ────────────────────────────────────────────────

describe("parseArgs", () => {
  const makeArgv = (...rest: string[]) => ["node", "cli.js", ...rest];

  aroundEach(async (test) => {
    const savedXdgStateHome = process.env.XDG_STATE_HOME;
    const savedStateFile = process.env.MICHINOEKI_STATE_FILE;
    process.env.XDG_STATE_HOME = "/xdg/state";
    delete process.env.MICHINOEKI_STATE_FILE;
    await test();
    if (savedXdgStateHome === undefined) delete process.env.XDG_STATE_HOME;
    else process.env.XDG_STATE_HOME = savedXdgStateHome;
    if (savedStateFile === undefined) delete process.env.MICHINOEKI_STATE_FILE;
    else process.env.MICHINOEKI_STATE_FILE = savedStateFile;
  });

  it("uses XDG default state path when no args given", () => {
    const options = parseArgs(makeArgv());
    expect(options.statePath).toBe("/xdg/state/michinoeki/state.json");
  });

  it("uses --state argument when provided", () => {
    const options = parseArgs(makeArgv("--state", "/tmp/custom.json"));
    expect(options.statePath).toBe("/tmp/custom.json");
  });

  it("uses MICHINOEKI_STATE_FILE env var when --state is not provided", () => {
    process.env.MICHINOEKI_STATE_FILE = "/env/state.json";
    const options = parseArgs(makeArgv());
    expect(options.statePath).toBe("/env/state.json");
  });

  it("--state argument takes precedence over MICHINOEKI_STATE_FILE env var", () => {
    process.env.MICHINOEKI_STATE_FILE = "/env/state.json";
    const options = parseArgs(makeArgv("--state", "/arg/state.json"));
    expect(options.statePath).toBe("/arg/state.json");
  });
});

// ── extractTopicsSection ─────────────────────────────────────

describe("extractTopicsSection", () => {
  it('extracts the inner HTML of <div id="ad1408_topics">', () => {
    const html = `
      <div>前置き</div>
      <div id="ad1408_topics">
        <ul><li><a href="/inside">中</a></li></ul>
      </div>
      <div>後置き<a href="/after">後</a></div>
    `;
    const section = extractTopicsSection(html);
    expect(section).not.toBeNull();
    expect(section).toContain("/inside");
    expect(section).not.toContain("/after");
  });

  it("tolerates extra attributes on the container div", () => {
    const html = `<div class="topics" id="ad1408_topics" data-x="1"><a href="/inside">x</a></div>`;
    expect(extractTopicsSection(html)).toContain("/inside");
  });

  it("returns null when the container is absent", () => {
    expect(extractTopicsSection('<div id="other">x</div>')).toBeNull();
  });
});

// ── extractUrls ──────────────────────────────────────────────

describe("extractUrls", () => {
  // Mirrors real topics.html: container div wrapping a UL with LI entries.
  const makePage = (topicsInner: string) => `
    <html><body>
      <header><a href="/header">header link (登録要件)</a></header>
      <div id="ad1408_topics">
        <ul>${topicsInner}</ul>
      </div>
      <footer><a href="/footer">footer link (登録)</a></footer>
    </body></html>
  `;

  it("extracts only registration-announcement URLs matching 回登録", () => {
    const html = makePage(`
      <li><font color="red">NEW</font><a href="https://www.mlit.go.jp/report/press/road01_hh_002085.html">「防災拠点自動車駐車場」を指定します（2026年4月15日）</a></li>
      <li><a href="https://www.mlit.go.jp/report/press/road01_hh_002029.html">「道の駅」の第64 回登録について～全国で1,231 駅に～</a>（2025年12月19日）</li>
      <li><a href="https://www.mlit.go.jp/report/press/road01_hh_001949.html">「道の駅」の第63 回登録について～全国で1,230 駅に～</a>（2025年6月13日）</li>
    `);
    expect(extractUrls(html)).toEqual([
      "https://www.mlit.go.jp/report/press/road01_hh_002029.html",
      "https://www.mlit.go.jp/report/press/road01_hh_001949.html",
    ]);
  });

  it("excludes guideline-change links that contain 登録 but not 回登録", () => {
    const html = makePage(`
      <li><a href="pdf/guidance.pdf">「道の駅」登録・案内要綱の当面の運用方針を一部変更しました。</a>(2022年5月9日)</li>
      <li><a href="https://www.mlit.go.jp/report/press/road01_hh_001883.html">「道の駅」の第62回登録について～今回９駅が登録され、全国で1,230駅となります～</a>（2025年1月31日）</li>
    `);
    expect(extractUrls(html)).toEqual(["https://www.mlit.go.jp/report/press/road01_hh_001883.html"]);
  });

  it("excludes non-registration press releases that happen to be in topics", () => {
    const html = makePage(`
      <li><a href="https://www.mlit.go.jp/report/press/road01_hh_001907.html">「道の駅」第3ステージの具体化に向けた議論～第13回「道の駅」第3ステージ推進委員会を開催～</a>（2025年3月18日）</li>
      <li><a href="https://www.mlit.go.jp/report/press/road01_hh_001932.html">「防災道の駅」を追加選定！～新たに40駅が追加選定され、全国で79駅となります～</a>（2025年5月14日）</li>
    `);
    expect(extractUrls(html)).toEqual([]);
  });

  it("ignores links outside #ad1408_topics even if they match", () => {
    const html = `
      <a href="/before/第99回登録">第99回登録について</a>
      <div id="ad1408_topics">
        <ul><li><a href="https://www.mlit.go.jp/report/press/road01_hh_002029.html">第64回登録について</a></li></ul>
      </div>
      <a href="/after/第100回登録">第100回登録について</a>
    `;
    expect(extractUrls(html)).toEqual(["https://www.mlit.go.jp/report/press/road01_hh_002029.html"]);
  });

  it("keeps absolute URLs (both http and https) as-is", () => {
    const html = makePage(`
      <li><a href="http://www.mlit.go.jp/report/press/road01_hh_001176.html">「道の駅」の第51回登録について ～今回6駅が登録され、1,160駅となります～</a>(2019年6月19日)</li>
      <li><a href="https://www.mlit.go.jp/report/press/road01_hh_002029.html">第64回登録について</a></li>
    `);
    expect(extractUrls(html)).toEqual([
      "http://www.mlit.go.jp/report/press/road01_hh_001176.html",
      "https://www.mlit.go.jp/report/press/road01_hh_002029.html",
    ]);
  });

  it("matches the real MLIT format '第NN 回登録' (space between digits and 回)", () => {
    // Verbatim from the real topics.html: 第64 回登録, 第63 回登録 with half-width space
    const html = makePage(`
      <li><a href="https://www.mlit.go.jp/report/press/road01_hh_002029.html">「道の駅」の第64 回登録について～全国で1,231 駅に～</a></li>
    `);
    expect(extractUrls(html)).toEqual(["https://www.mlit.go.jp/report/press/road01_hh_002029.html"]);
  });

  it("tolerates whitespace between 回 and 登録 as well", () => {
    const html = makePage(`
      <li><a href="/report/press/road01_hh_xxxxxx.html">第99回 登録について</a></li>
    `);
    expect(extractUrls(html)).toEqual(["https://www.mlit.go.jp/report/press/road01_hh_xxxxxx.html"]);
  });

  it("deduplicates the same URL appearing multiple times", () => {
    const html = makePage(`
      <li><a href="https://www.mlit.go.jp/report/press/road01_hh_002029.html">第64回登録について</a></li>
      <li><a href="https://www.mlit.go.jp/report/press/road01_hh_002029.html">第64回登録について</a></li>
    `);
    expect(extractUrls(html)).toEqual(["https://www.mlit.go.jp/report/press/road01_hh_002029.html"]);
  });

  it("falls back to full page with a warning when the container is missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const html = `
        <ul><li><a href="https://www.mlit.go.jp/report/press/road01_hh_002029.html">第64回登録について</a></li></ul>
      `;
      expect(extractUrls(html)).toEqual(["https://www.mlit.go.jp/report/press/road01_hh_002029.html"]);
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("returns empty array when topics section has no registration links", () => {
    const html = makePage(`
      <li><a href="https://www.mlit.go.jp/report/press/road01_hh_002085.html">「防災拠点自動車駐車場」を指定します</a></li>
    `);
    expect(extractUrls(html)).toEqual([]);
  });

  it("end-to-end: verbatim slice from real topics.html yields registration URLs only", () => {
    // Copy-pasted from the real https://www.mlit.go.jp/road/Michi-no-Eki/topics.html
    // to ensure the implementation works against the actual page structure.
    const html = `
      <div id="ad1408_topics">
        <ul>

          <li>
            <font color="red">NEW</font><a
              href="https://www.mlit.go.jp/report/press/road01_hh_002085.html">「防災拠点自動車駐車場」を指定します（2026年4月15日）</a>
          </li>
          <li><a
              href="https://www.mlit.go.jp/report/press/road01_hh_002074.html">「道の駅」第３ステージの具体化に向けた議論～第14
              回「道の駅」第３ステージ推進委員会を開催～</a>（2026年3月25日）</li>
          <li><a href="https://www.mlit.go.jp/report/press/road01_hh_002029.html">「道の駅」の第64
              回登録について～全国で1,231 駅に～</a>（2025年12月19日）</li>
          <li><a href="https://www.mlit.go.jp/report/press/road01_hh_001949.html">「道の駅」の第63
              回登録について～全国で1,230 駅に～</a>（2025年6月13日）</li>
          <li><a href="https://www.mlit.go.jp/report/press/road01_hh_001932.html">「防災道の駅」を追加選定！～新たに40
              駅が追加選定され、全国で79 駅となります～</a>（2025年5月14日）</li>
          <li><a
              href="https://www.mlit.go.jp/report/press/road01_hh_001883.html">「道の駅」の第62回登録について～今回９駅が登録され、全国で1,230駅となります～</a>（2025年1月31日）
          </li>
          <li><a href="pdf/guidance.pdf">「道の駅」登録・案内要綱の当面の運用方針を一部変更しました。</a>(2022年5月9日)</li>
          <li>「道の駅」登録・案内要綱等を一部変更しました。(2018年11月19日)</li>
        </ul>
      </div>
    `;
    expect(extractUrls(html)).toEqual([
      "https://www.mlit.go.jp/report/press/road01_hh_002029.html",
      "https://www.mlit.go.jp/report/press/road01_hh_001949.html",
      "https://www.mlit.go.jp/report/press/road01_hh_001883.html",
    ]);
  });
});

// ── filterNewUrls ────────────────────────────────────────────

describe("filterNewUrls", () => {
  it("returns all URLs when seenUrls is empty", () => {
    const urls = [
      "https://www.mlit.go.jp/report/press/road01_hh_001.html",
      "https://www.mlit.go.jp/report/press/road01_hh_002.html",
    ];
    expect(filterNewUrls(urls, new Set())).toEqual(urls);
  });

  it("excludes URLs that are in seenUrls", () => {
    const urls = [
      "https://www.mlit.go.jp/report/press/road01_hh_001.html",
      "https://www.mlit.go.jp/report/press/road01_hh_002.html",
      "https://www.mlit.go.jp/report/press/road01_hh_003.html",
    ];
    const seen = new Set([
      "https://www.mlit.go.jp/report/press/road01_hh_001.html",
      "https://www.mlit.go.jp/report/press/road01_hh_003.html",
    ]);
    expect(filterNewUrls(urls, seen)).toEqual(["https://www.mlit.go.jp/report/press/road01_hh_002.html"]);
  });

  it("returns empty array when all URLs are already seen", () => {
    const urls = ["https://www.mlit.go.jp/report/press/road01_hh_001.html"];
    const seen = new Set(["https://www.mlit.go.jp/report/press/road01_hh_001.html"]);
    expect(filterNewUrls(urls, seen)).toEqual([]);
  });
});

// ── rotateSeenUrls ───────────────────────────────────────────

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
