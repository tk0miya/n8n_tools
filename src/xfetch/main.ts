import { parseArgs as nodeParseArgs } from "node:util";
import type { AccountRunResult, XfetchState } from "./state.js";
import { getAccountState, getDefaultStatePath, loadState, mergeStateAfterRun, saveState } from "./state.js";
import type { FetchUserTweetsOptions, XClientApi, XError, XTweet, XUser } from "./xClient.js";
import { XClient } from "./xClient.js";

export interface RunOptions {
  usernames: string[];
  statePath: string;
  includeRetweets: boolean;
  includeReplies: boolean;
  patterns: RegExp[];
  invertMatch: boolean;
}

export interface AuthorInfo {
  id: string;
  username: string;
  name: string;
  profile_image_url: string | null;
}

export interface MediaInfo {
  type: string;
  url: string | null;
  preview_image_url: string | null;
}

export interface UrlInfo {
  url: string;
  expanded_url: string;
  display_url: string;
}

export interface PostEntry {
  id: string;
  url: string;
  text: string;
  created_at: string;
  lang: string | null;
  media: MediaInfo[];
  urls: UrlInfo[];
  author: AuthorInfo;
  retweeted_by: AuthorInfo | null;
}

export interface ErrorEntry {
  username: string;
  code: XError["code"];
  message: string;
  reset_at?: string;
}

export interface RunSummary {
  total_accounts: number;
  baseline_established: number;
  total_posts: number;
  errors: number;
}

export interface RunOutput {
  checked_at: string;
  posts: PostEntry[];
  errors: ErrorEntry[];
  summary: RunSummary;
}

export function parseUsername(input: string): string {
  try {
    const url = new URL(input);
    if (url.hostname === "x.com" || url.hostname === "twitter.com") {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length > 0) return parts[0];
    }
  } catch {
    // Not a URL
  }
  return input.replace(/^@/, "");
}

export function parseArgs(argv: string[]): RunOptions {
  const { values, positionals } = nodeParseArgs({
    args: argv.slice(2),
    options: {
      state: { type: "string" },
      "include-retweets": { type: "boolean" },
      "exclude-retweets": { type: "boolean" },
      "include-replies": { type: "boolean" },
      "exclude-replies": { type: "boolean" },
      regexp: { type: "string", multiple: true, short: "e" },
      "invert-match": { type: "boolean", short: "v" },
    },
    allowPositionals: true,
  });

  const patterns: RegExp[] = [];
  for (const p of values.regexp ?? []) {
    try {
      patterns.push(new RegExp(p));
    } catch {
      console.error(`Error: invalid regexp pattern: ${p}`);
      process.exit(1);
    }
  }

  return {
    usernames: positionals.map(parseUsername),
    statePath: values.state ?? process.env.XFETCH_STATE_FILE ?? getDefaultStatePath(),
    includeRetweets: values["exclude-retweets"] ? false : (values["include-retweets"] ?? true),
    includeReplies: values["exclude-replies"] ? false : (values["include-replies"] ?? false),
    patterns,
    invertMatch: values["invert-match"] ?? false,
  };
}

export function requireBearerToken(): string {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) {
    console.error("Error: X_BEARER_TOKEN environment variable is not set");
    process.exit(1);
  }
  return token;
}

export function buildPostEntry(tweet: XTweet): PostEntry {
  return {
    id: tweet.id,
    url: `https://x.com/${encodeURIComponent(tweet.author.username)}/status/${tweet.sourceTweetId}`,
    text: tweet.text,
    created_at: tweet.createdAt,
    lang: tweet.lang,
    media: tweet.media.map((m) => ({
      type: m.type,
      url: m.url,
      preview_image_url: m.previewImageUrl,
    })),
    urls: tweet.urls.map((u) => ({
      url: u.url,
      expanded_url: u.expandedUrl,
      display_url: u.displayUrl,
    })),
    author: toAuthorInfo(tweet.author),
    retweeted_by: tweet.retweetedBy ? toAuthorInfo(tweet.retweetedBy) : null,
  };
}

function toAuthorInfo(user: XUser): AuthorInfo {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    profile_image_url: user.profileImageUrl,
  };
}

export function filterPostsByPattern(posts: PostEntry[], patterns: RegExp[], invertMatch: boolean): PostEntry[] {
  if (patterns.length === 0) return posts;
  return posts.filter((post) => {
    const anyMatch = patterns.some((p) => p.test(post.text));
    return invertMatch ? !anyMatch : anyMatch;
  });
}

export function sortPostsChronologically(posts: PostEntry[]): PostEntry[] {
  return [...posts].sort((a, b) => {
    const ta = Date.parse(a.created_at);
    const tb = Date.parse(b.created_at);
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });
}

export function buildRunOutput(
  checkedAt: Date,
  accountsCount: number,
  baselineEstablishedCount: number,
  posts: PostEntry[],
  errors: ErrorEntry[],
): RunOutput {
  const sorted = sortPostsChronologically(posts);
  return {
    checked_at: checkedAt.toISOString(),
    posts: sorted,
    errors,
    summary: {
      total_accounts: accountsCount,
      baseline_established: baselineEstablishedCount,
      total_posts: sorted.length,
      errors: errors.length,
    },
  };
}

interface ProcessedAccount {
  accountResult: AccountRunResult;
  posts: PostEntry[];
  errorEntry: ErrorEntry | null;
  baselineEstablished: boolean;
}

export async function processAccount(
  username: string,
  user: XUser,
  state: XfetchState,
  client: XClientApi,
  options: Pick<RunOptions, "includeRetweets" | "includeReplies" | "patterns" | "invertMatch">,
): Promise<ProcessedAccount> {
  const previous = getAccountState(state, username);
  const isFirstRun = !previous || previous.lastSeenId === null;

  const fetchOptions: FetchUserTweetsOptions = {
    includeRetweets: options.includeRetweets,
    includeReplies: options.includeReplies,
  };

  if (isFirstRun) {
    // Baseline run: fetch only the most recent tweet to record as lastSeenId.
    fetchOptions.maxResults = 5;
    fetchOptions.maxPages = 1;
  } else {
    fetchOptions.sinceId = previous?.lastSeenId ?? null;
  }

  const result = await client.fetchUserTweets(user.id, fetchOptions);

  if (!result.ok) {
    return {
      accountResult: { username, status: "error" },
      posts: [],
      errorEntry: {
        username,
        code: result.error.code,
        message: result.error.message,
        ...(result.error.resetAt ? { reset_at: result.error.resetAt } : {}),
      },
      baselineEstablished: false,
    };
  }

  const tweets = result.tweets;

  if (isFirstRun) {
    const newestId = tweets[0]?.id ?? null;
    return {
      accountResult: { username, status: "baseline_established", newLastSeenId: newestId },
      posts: [],
      errorEntry: null,
      baselineEstablished: true,
    };
  }

  const newestId = tweets[0]?.id ?? previous?.lastSeenId ?? null;

  return {
    accountResult: { username, status: "ok", newLastSeenId: newestId },
    posts: filterPostsByPattern(
      tweets.map((tweet) => buildPostEntry(tweet)),
      options.patterns,
      options.invertMatch,
    ),
    errorEntry: null,
    baselineEstablished: false,
  };
}

export async function run(options: RunOptions): Promise<void> {
  if (options.usernames.length === 0) {
    console.error(
      JSON.stringify({
        error: "No usernames specified. Usage: xfetch [options] <username1> [username2 ...]",
      }),
    );
    process.exit(1);
  }

  const bearerToken = requireBearerToken();
  const client = new XClient(bearerToken);
  const state = await loadState(options.statePath);
  const now = new Date();

  const lookup = await client.lookupUsers(options.usernames);
  const posts: PostEntry[] = [];
  const errors: ErrorEntry[] = [];
  const accountResults: AccountRunResult[] = [];
  let baselineEstablishedCount = 0;

  if (!lookup.ok) {
    // Global failure during user lookup — no per-account processing possible.
    for (const username of options.usernames) {
      errors.push({
        username,
        code: lookup.error.code,
        message: lookup.error.message,
        ...(lookup.error.resetAt ? { reset_at: lookup.error.resetAt } : {}),
      });
    }
    const output = buildRunOutput(now, options.usernames.length, 0, posts, errors);
    console.log(JSON.stringify(output));
    process.exit(1);
  }

  const { found, missing } = lookup.result;

  for (const username of missing) {
    errors.push({
      username,
      code: "account_not_found",
      message: `user "${username}" not found`,
    });
    accountResults.push({ username, status: "error" });
  }

  const tasks = options.usernames
    .map((u) => {
      const key = u.toLowerCase();
      const user = found.get(key);
      if (!user) return null;
      return { username: u, user };
    })
    .filter((t): t is { username: string; user: XUser } => t !== null);

  const settled = await Promise.allSettled(
    tasks.map((t) => processAccount(t.username, t.user, state, client, options)),
  );

  for (let i = 0; i < settled.length; i += 1) {
    const s = settled[i];
    const username = tasks[i].username;
    if (s.status === "fulfilled") {
      accountResults.push(s.value.accountResult);
      posts.push(...s.value.posts);
      if (s.value.errorEntry) {
        errors.push(s.value.errorEntry);
      }
      if (s.value.baselineEstablished) {
        baselineEstablishedCount += 1;
      }
    } else {
      accountResults.push({ username, status: "error" });
      errors.push({
        username,
        code: "fetch_failed",
        message: s.reason instanceof Error ? s.reason.message : String(s.reason),
      });
    }
  }

  const output = buildRunOutput(now, options.usernames.length, baselineEstablishedCount, posts, errors);

  const nextState = mergeStateAfterRun(state, accountResults, now);
  await saveState(nextState, options.statePath);

  console.log(JSON.stringify(output));

  const anySuccess = accountResults.some((r) => r.status !== "error");
  if (!anySuccess) {
    process.exit(1);
  }
}
