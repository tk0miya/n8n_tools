import { parseArgs as nodeParseArgs } from "node:util";
import type { AccountState, XfetchState } from "./state.js";
import { getAccountState, getDefaultStatePath, loadState, STATE_VERSION, saveState } from "./state.js";
import type { FetchUserPostsOptions, XClientApi, XError, XPost, XUser } from "./xClient.js";
import { XClient } from "./xClient.js";

export interface RunOptions {
  usernames: string[];
  statePath: string;
  includeReposts: boolean;
  includeReplies: boolean;
  patterns: RegExp[];
  invertMatch: boolean;
  inlineMedia: boolean;
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

export interface PostEntry {
  id: string;
  url: string;
  text: string;
  created_at: string;
  media: MediaInfo[];
  author: AuthorInfo;
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
      "include-reposts": { type: "boolean" },
      "exclude-reposts": { type: "boolean" },
      "include-replies": { type: "boolean" },
      "exclude-replies": { type: "boolean" },
      regexp: { type: "string", multiple: true, short: "e" },
      "invert-match": { type: "boolean", short: "v" },
      "inline-media": { type: "boolean" },
    },
    allowPositionals: true,
  });

  const patterns: RegExp[] = [];
  for (const p of values.regexp ?? []) {
    try {
      patterns.push(new RegExp(p));
    } catch {
      throw new Error(`invalid regexp pattern: ${p}`);
    }
  }

  return {
    usernames: positionals.map(parseUsername),
    statePath: values.state ?? process.env.XFETCH_STATE_FILE ?? getDefaultStatePath(),
    includeReposts: values["exclude-reposts"] ? false : (values["include-reposts"] ?? true),
    includeReplies: values["exclude-replies"] ? false : (values["include-replies"] ?? false),
    patterns,
    invertMatch: values["invert-match"] ?? false,
    inlineMedia: values["inline-media"] ?? false,
  };
}

export function requireBearerToken(): string {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) {
    throw new Error("X_BEARER_TOKEN environment variable is not set");
  }
  return token;
}

export function buildPostEntry(post: XPost, options: { inlineMedia?: boolean } = {}): PostEntry {
  let text = post.text;
  if (options.inlineMedia && post.media.length > 0) {
    const urls = post.media.map((m) => m.url ?? m.previewImageUrl).filter((url): url is string => url !== null);
    if (urls.length > 0) {
      text = `${text}\n${urls.join("\n")}`;
    }
  }
  return {
    id: post.id,
    url: `https://x.com/${post.author.username}/status/${post.id}`,
    text,
    created_at: post.createdAt,
    media: post.media.map((m) => ({
      type: m.type,
      url: m.url,
      preview_image_url: m.previewImageUrl,
    })),
    author: toAuthorInfo(post.author),
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

export function toErrorEntry(username: string, error: XError): ErrorEntry {
  return {
    username,
    code: error.code,
    message: error.message,
    ...(error.resetAt ? { reset_at: error.resetAt } : {}),
  };
}

export function filterPostsByPattern(posts: PostEntry[], patterns: RegExp[], invertMatch: boolean): PostEntry[] {
  if (patterns.length === 0) return posts;
  return posts.filter((post) => {
    const anyMatch = patterns.some((p) => p.test(post.text));
    return invertMatch ? !anyMatch : anyMatch;
  });
}

export function buildRunOutput(
  checkedAt: Date,
  accountsCount: number,
  baselineEstablishedCount: number,
  posts: PostEntry[],
  errors: ErrorEntry[],
): RunOutput {
  return {
    checked_at: checkedAt.toISOString(),
    posts,
    errors,
    summary: {
      total_accounts: accountsCount,
      baseline_established: baselineEstablishedCount,
      total_posts: posts.length,
      errors: errors.length,
    },
  };
}

export interface AccountRunResult {
  username: string;
  status: "ok" | "baseline_established" | "error";
  newLastSeenId?: string | null;
}

interface ProcessedAccount {
  accountResult: AccountRunResult;
  posts: PostEntry[];
  errorEntry: ErrorEntry | null;
  baselineEstablished: boolean;
}

export async function processAccount(
  username: string,
  userId: string,
  state: AccountState | undefined,
  client: XClientApi,
  options: Pick<RunOptions, "includeReposts" | "includeReplies" | "patterns" | "invertMatch" | "inlineMedia">,
): Promise<ProcessedAccount> {
  const isFirstRun = !state || state.lastSeenId === null;

  const fetchOptions: FetchUserPostsOptions = {
    includeReposts: options.includeReposts,
    includeReplies: options.includeReplies,
    sort: true,
  };

  if (isFirstRun) {
    // Baseline run: fetch only the most recent post to record as lastSeenId.
    fetchOptions.maxResults = 5;
    fetchOptions.maxPages = 1;
  } else {
    fetchOptions.sinceId = state?.lastSeenId ?? null;
  }

  const result = await client.fetchUserPosts(userId, fetchOptions);

  if (!result.ok) {
    return {
      accountResult: { username, status: "error" },
      posts: [],
      errorEntry: toErrorEntry(username, result.error),
      baselineEstablished: false,
    };
  }

  const posts = result.posts;

  if (isFirstRun) {
    // sort: true returns posts oldest-first; the last element is the newest.
    const newestId = posts.at(-1)?.id ?? null;
    return {
      accountResult: { username, status: "baseline_established", newLastSeenId: newestId },
      posts: [],
      errorEntry: null,
      baselineEstablished: true,
    };
  }

  // sort: true returns posts oldest-first; the last element is the newest.
  const newestId = posts.at(-1)?.id ?? state?.lastSeenId ?? null;

  return {
    accountResult: { username, status: "ok", newLastSeenId: newestId },
    posts: filterPostsByPattern(
      posts.map((post) => buildPostEntry(post, { inlineMedia: options.inlineMedia })),
      options.patterns,
      options.invertMatch,
    ),
    errorEntry: null,
    baselineEstablished: false,
  };
}

export function mergeStateAfterRun(
  state: XfetchState,
  results: readonly AccountRunResult[],
  now: Date = new Date(),
): XfetchState {
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

export async function run(options: RunOptions): Promise<number> {
  if (options.usernames.length === 0) {
    console.error(
      JSON.stringify({
        error: "No usernames specified. Usage: xfetch [options] <username1> [username2 ...]",
      }),
    );
    return 1;
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
    for (const u of options.usernames) {
      errors.push(toErrorEntry(u, lookup.error));
    }
    const output = buildRunOutput(now, options.usernames.length, 0, posts, errors);
    console.log(JSON.stringify(output));
    return 1;
  }

  const { found } = lookup;

  const tasks = options.usernames
    .map((u) => {
      const userId = found.get(u.toLowerCase());
      if (!userId) {
        errors.push({ username: u, code: "account_not_found", message: `user "${u}" not found` });
        accountResults.push({ username: u, status: "error" });
        return null;
      }
      return { username: u, userId };
    })
    .filter((t): t is { username: string; userId: string } => t !== null);

  const settled = await Promise.allSettled(
    tasks.map((t) => processAccount(t.username, t.userId, getAccountState(state, t.username), client, options)),
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
  return anySuccess ? 0 : 1;
}
