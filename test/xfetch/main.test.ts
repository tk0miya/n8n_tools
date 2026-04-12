import { aroundEach, describe, expect, it } from "vitest";
import type { PostEntry, RunOptions } from "@/xfetch/main.js";
import {
  buildPostEntry,
  buildRunOutput,
  filterPostsByPattern,
  parseArgs,
  parseUsername,
  processAccount,
  sortPostsChronologically,
} from "@/xfetch/main.js";
import { emptyState, STATE_VERSION } from "@/xfetch/state.js";
import type { FetchUserTweetsOptions, XClientApi, XTweet, XUser } from "@/xfetch/xClient.js";

// ── parseArgs ────────────────────────────────────────────────

describe("parseArgs", () => {
  const makeArgv = (...rest: string[]) => ["node", "cli.js", ...rest];

  aroundEach(async (test) => {
    const savedXdgStateHome = process.env.XDG_STATE_HOME;
    const savedXfetchState = process.env.XFETCH_STATE_FILE;
    process.env.XDG_STATE_HOME = "/xdg/state";
    delete process.env.XFETCH_STATE_FILE;
    await test();
    if (savedXdgStateHome === undefined) delete process.env.XDG_STATE_HOME;
    else process.env.XDG_STATE_HOME = savedXdgStateHome;
    if (savedXfetchState === undefined) delete process.env.XFETCH_STATE_FILE;
    else process.env.XFETCH_STATE_FILE = savedXfetchState;
  });

  it("returns defaults when only positional usernames are given", () => {
    const options = parseArgs(makeArgv("elonmusk", "sama"));
    expect(options).toEqual({
      usernames: ["elonmusk", "sama"],
      statePath: "/xdg/state/xfetch/state.json",
      includeRetweets: true,
      includeReplies: false,
      patterns: [],
      invertMatch: false,
    });
  });

  it("parses --include-retweets and --include-replies flags", () => {
    const options = parseArgs(makeArgv("--state", "/tmp/s.json", "--include-retweets", "--include-replies", "elon"));
    expect(options).toEqual({
      usernames: ["elon"],
      statePath: "/tmp/s.json",
      includeRetweets: true,
      includeReplies: true,
      patterns: [],
      invertMatch: false,
    });
  });

  it("parses --exclude-retweets and --exclude-replies flags", () => {
    const options = parseArgs(makeArgv("--exclude-retweets", "--exclude-replies", "elon"));
    expect(options).toEqual({
      usernames: ["elon"],
      statePath: "/xdg/state/xfetch/state.json",
      includeRetweets: false,
      includeReplies: false,
      patterns: [],
      invertMatch: false,
    });
  });

  it("uses XFETCH_STATE_FILE env var when --state is not specified", () => {
    process.env.XFETCH_STATE_FILE = "/env/state.json";
    const options = parseArgs(makeArgv("elon"));
    expect(options.statePath).toBe("/env/state.json");
  });

  it("--state argument takes precedence over XFETCH_STATE_FILE env var", () => {
    process.env.XFETCH_STATE_FILE = "/env/state.json";
    const options = parseArgs(makeArgv("--state", "/arg/state.json", "elon"));
    expect(options.statePath).toBe("/arg/state.json");
  });

  it("falls back to XDG default when neither --state nor XFETCH_STATE_FILE is set", () => {
    const options = parseArgs(makeArgv("elon"));
    expect(options.statePath).toBe("/xdg/state/xfetch/state.json");
  });

  it("exclude-* takes precedence over include-* when both are set", () => {
    const rt = parseArgs(makeArgv("--include-retweets", "--exclude-retweets", "elon"));
    expect(rt.includeRetweets).toBe(false);
    const rep = parseArgs(makeArgv("--include-replies", "--exclude-replies", "elon"));
    expect(rep.includeReplies).toBe(false);
  });

  it("parses -e pattern as a regexp", () => {
    const options = parseArgs(makeArgv("-e", "hello", "elon"));
    expect(options.patterns).toHaveLength(1);
    expect(options.patterns[0]).toEqual(/hello/);
    expect(options.invertMatch).toBe(false);
  });

  it("parses multiple -e patterns", () => {
    const options = parseArgs(makeArgv("-e", "foo", "-e", "bar", "elon"));
    expect(options.patterns).toEqual([/foo/, /bar/]);
  });

  it("parses --regexp as long form of -e", () => {
    const options = parseArgs(makeArgv("--regexp", "world", "elon"));
    expect(options.patterns).toEqual([/world/]);
  });

  it("parses -v as invert-match", () => {
    const options = parseArgs(makeArgv("-v", "-e", "spam", "elon"));
    expect(options.invertMatch).toBe(true);
    expect(options.patterns).toEqual([/spam/]);
  });

  it("parses --invert-match as long form of -v", () => {
    const options = parseArgs(makeArgv("--invert-match", "-e", "spam", "elon"));
    expect(options.invertMatch).toBe(true);
  });

  it("supports regexp special characters in -e patterns", () => {
    const options = parseArgs(makeArgv("-e", "^hello\\s+world$", "elon"));
    expect(options.patterns[0]).toEqual(/^hello\s+world$/);
  });

  it("strips a leading @ from usernames", () => {
    const options = parseArgs(makeArgv("@elonmusk"));
    expect(options.usernames).toEqual(["elonmusk"]);
  });

  it("extracts username from https://x.com/foo URL", () => {
    const options = parseArgs(makeArgv("https://x.com/elonmusk"));
    expect(options.usernames).toEqual(["elonmusk"]);
  });
});

// ── parseUsername ────────────────────────────────────────────

describe("parseUsername", () => {
  it("returns plain username as-is", () => {
    expect(parseUsername("elonmusk")).toBe("elonmusk");
  });

  it("strips a leading @", () => {
    expect(parseUsername("@elonmusk")).toBe("elonmusk");
  });

  it("extracts username from https://x.com/foo", () => {
    expect(parseUsername("https://x.com/elonmusk")).toBe("elonmusk");
  });

  it("extracts username from https://twitter.com/foo", () => {
    expect(parseUsername("https://twitter.com/elonmusk")).toBe("elonmusk");
  });
});

// ── buildPostEntry & sorting ─────────────────────────────────

const sampleUser: XUser = {
  id: "123",
  username: "elonmusk",
  name: "Elon",
  profileImageUrl: "https://pbs.twimg.com/profile_images/1/e_400x400.jpg",
};

const makeTweet = (id: string, createdAt: string, extra: Partial<XTweet> = {}): XTweet => ({
  id,
  sourceTweetId: id,
  text: `tweet ${id}`,
  createdAt,
  lang: "en",
  author: sampleUser,
  retweetedBy: null,
  media: [],
  urls: [],
  ...extra,
});

describe("buildPostEntry", () => {
  it("builds the post url from the tweet author username and sourceTweetId", () => {
    const entry = buildPostEntry(makeTweet("9001", "2026-04-11T12:00:00.000Z"));
    expect(entry.url).toBe("https://x.com/elonmusk/status/9001");
  });

  it("embeds author and media", () => {
    const tweet = makeTweet("5", "2026-04-11T12:00:00.000Z", {
      media: [{ type: "photo", url: "https://pbs.twimg.com/media/a.jpg", previewImageUrl: null, mediaKey: "k1" }],
    });
    const entry = buildPostEntry(tweet);
    expect(entry.author).toEqual({
      id: "123",
      username: "elonmusk",
      name: "Elon",
      profile_image_url: "https://pbs.twimg.com/profile_images/1/e_400x400.jpg",
    });
    expect(entry.media).toEqual([{ type: "photo", url: "https://pbs.twimg.com/media/a.jpg", preview_image_url: null }]);
  });

  it("defaults retweeted_by to null for normal tweets", () => {
    const entry = buildPostEntry(makeTweet("1", "2026-04-11T12:00:00.000Z"));
    expect(entry.retweeted_by).toBeNull();
  });

  it("maps tweet entities.urls to post urls with snake_case keys", () => {
    const tweet = makeTweet("5", "2026-04-11T12:00:00.000Z", {
      urls: [
        {
          url: "https://t.co/abc",
          expandedUrl: "https://example.com/page",
          displayUrl: "example.com/page",
        },
      ],
    });
    const entry = buildPostEntry(tweet);
    expect(entry.urls).toEqual([
      { url: "https://t.co/abc", expanded_url: "https://example.com/page", display_url: "example.com/page" },
    ]);
  });

  it("returns an empty urls array when the tweet has no link entities", () => {
    const entry = buildPostEntry(makeTweet("1", "2026-04-11T12:00:00.000Z"));
    expect(entry.urls).toEqual([]);
  });

  it("surfaces the original author in author and the retweeter in retweeted_by for retweets", () => {
    const originalAuthor: XUser = {
      id: "999",
      username: "sama",
      name: "Sam",
      profileImageUrl: "https://pbs.twimg.com/profile_images/2/s_400x400.jpg",
    };
    const tweet: XTweet = {
      id: "1700", // retweet entry id on elonmusk's timeline
      sourceTweetId: "1500", // original tweet id by sama
      text: "full original text",
      createdAt: "2026-04-11T12:00:00.000Z",
      lang: "en",
      author: originalAuthor,
      retweetedBy: sampleUser,
      media: [],
      urls: [],
    };
    const entry = buildPostEntry(tweet);
    expect(entry.id).toBe("1700");
    expect(entry.url).toBe("https://x.com/sama/status/1500");
    expect(entry.text).toBe("full original text");
    expect(entry.author).toEqual({
      id: "999",
      username: "sama",
      name: "Sam",
      profile_image_url: "https://pbs.twimg.com/profile_images/2/s_400x400.jpg",
    });
    expect(entry.retweeted_by).toEqual({
      id: "123",
      username: "elonmusk",
      name: "Elon",
      profile_image_url: "https://pbs.twimg.com/profile_images/1/e_400x400.jpg",
    });
  });
});

describe("sortPostsChronologically", () => {
  it("sorts posts from multiple authors in ascending created_at order", () => {
    const a = buildPostEntry(makeTweet("1", "2026-04-11T12:00:00.000Z"), sampleUser);
    const b = buildPostEntry(makeTweet("2", "2026-04-11T11:00:00.000Z"), sampleUser);
    const c = buildPostEntry(makeTweet("3", "2026-04-11T13:00:00.000Z"), sampleUser);
    const sorted = sortPostsChronologically([a, b, c]);
    expect(sorted.map((p) => p.id)).toEqual(["2", "1", "3"]);
  });
});

// ── filterPostsByPattern ─────────────────────────────────────

describe("filterPostsByPattern", () => {
  const makePost = (text: string): PostEntry => ({
    ...buildPostEntry(makeTweet("1", "2026-04-11T12:00:00.000Z", { text })),
    text,
  });

  it("returns all posts when patterns is empty", () => {
    const posts = [makePost("hello world"), makePost("foo bar")];
    expect(filterPostsByPattern(posts, [], false)).toEqual(posts);
  });

  it("keeps only posts that match any pattern when invertMatch is false", () => {
    const posts = [makePost("hello world"), makePost("foo bar"), makePost("hello foo")];
    const result = filterPostsByPattern(posts, [/hello/], false);
    expect(result.map((p) => p.text)).toEqual(["hello world", "hello foo"]);
  });

  it("excludes posts that match any pattern when invertMatch is true", () => {
    const posts = [makePost("hello world"), makePost("foo bar"), makePost("hello foo")];
    const result = filterPostsByPattern(posts, [/hello/], true);
    expect(result.map((p) => p.text)).toEqual(["foo bar"]);
  });

  it("matches if any of multiple patterns match (OR semantics)", () => {
    const posts = [makePost("apple pie"), makePost("banana split"), makePost("cherry cake")];
    const result = filterPostsByPattern(posts, [/apple/, /banana/], false);
    expect(result.map((p) => p.text)).toEqual(["apple pie", "banana split"]);
  });

  it("excludes posts matching any pattern when invertMatch is true with multiple patterns", () => {
    const posts = [makePost("apple pie"), makePost("banana split"), makePost("cherry cake")];
    const result = filterPostsByPattern(posts, [/apple/, /banana/], true);
    expect(result.map((p) => p.text)).toEqual(["cherry cake"]);
  });

  it("matches case-sensitively", () => {
    const posts = [makePost("Hello World"), makePost("hello world")];
    const result = filterPostsByPattern(posts, [/hello/], false);
    expect(result.map((p) => p.text)).toEqual(["hello world"]);
  });

  it("returns empty array when no posts match", () => {
    const posts = [makePost("foo"), makePost("bar")];
    expect(filterPostsByPattern(posts, [/zzz/], false)).toEqual([]);
  });
});

// ── buildRunOutput ───────────────────────────────────────────

describe("buildRunOutput", () => {
  const NOW = new Date("2026-04-11T12:34:56.000Z");

  it("builds the full output shape with summary counts", () => {
    const posts: PostEntry[] = [
      buildPostEntry(makeTweet("100", "2026-04-11T11:00:00.000Z"), sampleUser),
      buildPostEntry(makeTweet("101", "2026-04-11T12:00:00.000Z"), sampleUser),
    ];
    const output = buildRunOutput(NOW, 3, 1, posts, [
      { username: "ghost", code: "account_not_found", message: "not found" },
    ]);
    expect(output.checked_at).toBe("2026-04-11T12:34:56.000Z");
    expect(output.posts.map((p) => p.id)).toEqual(["100", "101"]);
    expect(output.errors).toHaveLength(1);
    expect(output.summary).toEqual({
      total_accounts: 3,
      baseline_established: 1,
      total_posts: 2,
      errors: 1,
    });
  });
});

// ── processAccount ───────────────────────────────────────────

function makeClient(fetchImpl: (userId: string, opts?: FetchUserTweetsOptions) => Promise<XTweet[]>): XClientApi {
  return {
    lookupUsers: async () => ({ ok: true, result: { found: new Map(), missing: [] } }),
    fetchUserTweets: async (userId, opts) => {
      const tweets = await fetchImpl(userId, opts);
      return { ok: true as const, tweets };
    },
  };
}

const baseOptions: Pick<RunOptions, "includeRetweets" | "includeReplies" | "patterns" | "invertMatch"> = {
  includeRetweets: true,
  includeReplies: false,
  patterns: [],
  invertMatch: false,
};

describe("processAccount", () => {
  it("returns baseline_established on first run without producing posts", async () => {
    let capturedOpts: FetchUserTweetsOptions | undefined;
    const client = makeClient(async (_id, opts) => {
      capturedOpts = opts;
      return [makeTweet("999", "2026-04-11T12:00:00.000Z")];
    });
    const state = emptyState();
    const processed = await processAccount("elonmusk", sampleUser, state, client, baseOptions);
    expect(processed.accountResult.status).toBe("baseline_established");
    expect(processed.accountResult.newLastSeenId).toBe("999");
    expect(processed.posts).toEqual([]);
    expect(processed.baselineEstablished).toBe(true);
    // On baseline run, sinceId must not be set and max_results is small.
    expect(capturedOpts?.sinceId).toBeUndefined();
    expect(capturedOpts?.maxResults).toBe(5);
    expect(capturedOpts?.maxPages).toBe(1);
  });

  it("uses the cached lastSeenId as since_id on subsequent runs", async () => {
    let capturedOpts: FetchUserTweetsOptions | undefined;
    const client = makeClient(async (_id, opts) => {
      capturedOpts = opts;
      return [makeTweet("200", "2026-04-11T12:00:00.000Z"), makeTweet("199", "2026-04-11T11:00:00.000Z")];
    });
    const state = {
      version: STATE_VERSION as 1,
      accounts: {
        elonmusk: { lastSeenId: "100", lastCheckedAt: "2026-04-10T00:00:00.000Z" },
      },
    };
    const processed = await processAccount("elonmusk", sampleUser, state, client, baseOptions);
    expect(capturedOpts?.sinceId).toBe("100");
    // Subsequent runs should use the xClient defaults (page size / max pages).
    expect(capturedOpts?.maxResults).toBeUndefined();
    expect(capturedOpts?.maxPages).toBeUndefined();
    expect(processed.accountResult).toEqual({
      username: "elonmusk",
      status: "ok",
      newLastSeenId: "200",
    });
    expect(processed.posts.map((p) => p.id)).toEqual(["200", "199"]);
  });

  it("preserves cached lastSeenId on a subsequent run with no new tweets", async () => {
    const client = makeClient(async () => []);
    const state = {
      version: STATE_VERSION as 1,
      accounts: {
        elonmusk: { lastSeenId: "100", lastCheckedAt: "2026-04-10T00:00:00.000Z" },
      },
    };
    const processed = await processAccount("elonmusk", sampleUser, state, client, baseOptions);
    expect(processed.accountResult).toEqual({
      username: "elonmusk",
      status: "ok",
      newLastSeenId: "100",
    });
    expect(processed.posts).toEqual([]);
    expect(processed.errorEntry).toBeNull();
    expect(processed.baselineEstablished).toBe(false);
  });

  it("returns an error entry when fetchUserTweets fails", async () => {
    const client: XClientApi = {
      lookupUsers: async () => ({ ok: true, result: { found: new Map(), missing: [] } }),
      fetchUserTweets: async () => ({
        ok: false,
        error: { code: "rate_limited", message: "429", resetAt: "2026-04-11T13:00:00.000Z" },
      }),
    };
    const state = {
      version: STATE_VERSION as 1,
      accounts: {
        elonmusk: { lastSeenId: "100", lastCheckedAt: "2026-04-10T00:00:00.000Z" },
      },
    };
    const processed = await processAccount("elonmusk", sampleUser, state, client, baseOptions);
    expect(processed.accountResult.status).toBe("error");
    expect(processed.errorEntry).toEqual({
      username: "elonmusk",
      code: "rate_limited",
      message: "429",
      reset_at: "2026-04-11T13:00:00.000Z",
    });
    expect(processed.posts).toEqual([]);
  });

  it("returns empty baseline when account has zero tweets", async () => {
    const client = makeClient(async () => []);
    const processed = await processAccount("elonmusk", sampleUser, emptyState(), client, baseOptions);
    expect(processed.accountResult).toEqual({
      username: "elonmusk",
      status: "baseline_established",
      newLastSeenId: null,
    });
  });

  it("filters posts by pattern when patterns are specified", async () => {
    const client = makeClient(async () => [
      makeTweet("200", "2026-04-11T12:00:00.000Z", { text: "hello world" }),
      makeTweet("199", "2026-04-11T11:00:00.000Z", { text: "foo bar" }),
    ]);
    const state = {
      version: STATE_VERSION as 1,
      accounts: {
        elonmusk: { lastSeenId: "100", lastCheckedAt: "2026-04-10T00:00:00.000Z" },
      },
    };
    const processed = await processAccount("elonmusk", sampleUser, state, client, {
      ...baseOptions,
      patterns: [/hello/],
      invertMatch: false,
    });
    expect(processed.posts.map((p) => p.text)).toEqual(["hello world"]);
  });

  it("excludes posts matching pattern when invertMatch is true", async () => {
    const client = makeClient(async () => [
      makeTweet("200", "2026-04-11T12:00:00.000Z", { text: "hello world" }),
      makeTweet("199", "2026-04-11T11:00:00.000Z", { text: "foo bar" }),
    ]);
    const state = {
      version: STATE_VERSION as 1,
      accounts: {
        elonmusk: { lastSeenId: "100", lastCheckedAt: "2026-04-10T00:00:00.000Z" },
      },
    };
    const processed = await processAccount("elonmusk", sampleUser, state, client, {
      ...baseOptions,
      patterns: [/hello/],
      invertMatch: true,
    });
    expect(processed.posts.map((p) => p.text)).toEqual(["foo bar"]);
  });

  it("tracks newLastSeenId from the newest fetched tweet even when it is excluded by the filter", async () => {
    // Tweet "200" is the newest but matches the exclusion pattern.
    // It must still advance newLastSeenId so the next run does not re-fetch it.
    const client = makeClient(async () => [
      makeTweet("200", "2026-04-11T12:00:00.000Z", { text: "spam content" }),
      makeTweet("199", "2026-04-11T11:00:00.000Z", { text: "useful content" }),
    ]);
    const state = {
      version: STATE_VERSION as 1,
      accounts: {
        elonmusk: { lastSeenId: "100", lastCheckedAt: "2026-04-10T00:00:00.000Z" },
      },
    };
    const processed = await processAccount("elonmusk", sampleUser, state, client, {
      ...baseOptions,
      patterns: [/spam/],
      invertMatch: true,
    });
    expect(processed.posts.map((p) => p.text)).toEqual(["useful content"]);
    expect(processed.accountResult.newLastSeenId).toBe("200");
  });
});
