export const X_API_BASE = "https://api.x.com/2";
export const DEFAULT_PAGE_SIZE = 100;
export const DEFAULT_MAX_PAGES = 5;
export const USER_LOOKUP_BATCH_SIZE = 100;

export type XErrorCode = "unauthorized" | "account_not_found" | "rate_limited" | "fetch_failed";

export interface XError {
  code: XErrorCode;
  message: string;
  resetAt?: string;
}

export interface XUser {
  id: string;
  username: string;
  name: string;
  profileImageUrl: string | null;
}

export interface XUserLookup {
  found: Map<string, XUser>; // key = lowercase username
  missing: string[]; // lowercase usernames
}

export interface XMediaEntry {
  type: string;
  url: string | null;
  previewImageUrl: string | null;
  mediaKey: string;
}

export interface XUrlEntry {
  url: string; // the t.co URL as it appears in the tweet text
  expandedUrl: string; // the fully expanded destination URL
  displayUrl: string; // the display-friendly URL shown in clients
}

export interface XTweet {
  id: string;
  sourceTweetId: string; // original tweet id; same as `id` unless this is a retweet
  text: string;
  createdAt: string;
  lang: string | null;
  author: XUser; // effective author: for retweets this is the original poster
  retweetedBy: XUser | null; // set only when the timeline entry is a retweet
  media: XMediaEntry[];
  urls: XUrlEntry[];
}

export interface FetchUserTweetsOptions {
  sinceId?: string | null;
  maxResults?: number;
  maxPages?: number;
  includeRetweets?: boolean;
  includeReplies?: boolean;
}

export interface FetchUserTweetsSuccess {
  ok: true;
  tweets: XTweet[];
}

export interface FetchUserTweetsFailure {
  ok: false;
  error: XError;
}

export type FetchUserTweetsResult = FetchUserTweetsSuccess | FetchUserTweetsFailure;

export interface LookupUsersSuccess {
  ok: true;
  result: XUserLookup;
}

export interface LookupUsersFailure {
  ok: false;
  error: XError;
}

export type LookupUsersResult = LookupUsersSuccess | LookupUsersFailure;

interface RawUser {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
}

interface RawMedia {
  media_key: string;
  type: string;
  url?: string;
  preview_image_url?: string;
}

interface RawUrlEntity {
  url: string;
  expanded_url?: string;
  display_url?: string;
}

interface RawReferencedTweet {
  type: string; // "retweeted" | "quoted" | "replied_to"
  id: string;
}

interface RawTweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  lang?: string;
  attachments?: { media_keys?: string[] };
  entities?: { urls?: RawUrlEntity[] };
  referenced_tweets?: RawReferencedTweet[];
}

interface RawTweetsResponse {
  data?: RawTweet[];
  includes?: {
    media?: RawMedia[];
    tweets?: RawTweet[];
    users?: RawUser[];
  };
  meta?: {
    result_count?: number;
    next_token?: string;
    newest_id?: string;
    oldest_id?: string;
  };
  errors?: unknown;
}

interface RawUsersResponse {
  data?: RawUser[];
  errors?: Array<{ parameter?: string; value?: string; detail?: string }>;
}

export function normalizeProfileImageUrl(url: string | undefined | null): string | null {
  if (!url) {
    return null;
  }
  return url.replace(/_normal(\.(?:jpg|jpeg|png|gif|webp))/i, "_400x400$1");
}

export function parseRateLimitHeaders(headers: Headers): { resetAt?: string } {
  const reset = headers.get("x-rate-limit-reset");
  if (!reset) {
    return {};
  }
  const seconds = Number(reset);
  if (!Number.isFinite(seconds)) {
    return {};
  }
  return { resetAt: new Date(seconds * 1000).toISOString() };
}

function classifyHttpError(status: number, headers: Headers, fallbackMessage: string): XError {
  if (status === 401 || status === 403) {
    return { code: "unauthorized", message: `X API returned ${status}: ${fallbackMessage}` };
  }
  if (status === 404) {
    return { code: "account_not_found", message: `X API returned 404: ${fallbackMessage}` };
  }
  if (status === 429) {
    const { resetAt } = parseRateLimitHeaders(headers);
    return {
      code: "rate_limited",
      message: `X API returned 429: ${fallbackMessage}`,
      ...(resetAt ? { resetAt } : {}),
    };
  }
  return { code: "fetch_failed", message: `X API returned ${status}: ${fallbackMessage}` };
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return "<no body>";
  }
}

function resolveXUser(userId: string, usersMap: ReadonlyMap<string, XUser>): XUser {
  const found = usersMap.get(userId);
  if (found) {
    return found;
  }
  // Fallback when the API did not include a user record for this id — should
  // not normally happen because we request author_id expansion, but callers
  // still need a sensible author object rather than a crash.
  return { id: userId, username: `id_${userId}`, name: "", profileImageUrl: null };
}

function mapRawMedia(mediaKeys: readonly string[] | undefined, mediaMap: ReadonlyMap<string, RawMedia>): XMediaEntry[] {
  return (mediaKeys ?? [])
    .map((key): XMediaEntry | null => {
      const media = mediaMap.get(key);
      if (!media) return null;
      return {
        type: media.type,
        url: media.url ?? null,
        previewImageUrl: media.preview_image_url ?? null,
        mediaKey: media.media_key,
      };
    })
    .filter((m): m is XMediaEntry => m !== null);
}

function mapRawUrls(entities: RawTweet["entities"]): XUrlEntry[] {
  return (entities?.urls ?? [])
    .map((entry): XUrlEntry | null => {
      if (!entry.expanded_url) return null;
      return {
        url: entry.url,
        expandedUrl: entry.expanded_url,
        displayUrl: entry.display_url ?? entry.expanded_url,
      };
    })
    .filter((u): u is XUrlEntry => u !== null);
}

/**
 * Converts a single raw timeline entry into the internal {@link XTweet}
 * shape, resolving retweet indirection so callers always see the original
 * author and full content. Exported for test setup; not intended as a
 * general-purpose public helper.
 *
 * Quote tweets (`type === "quoted"`) and replies (`type === "replied_to"`)
 * intentionally pass through unchanged: the quoter/replier is the
 * effective author because the visible content is their own commentary,
 * not the referenced tweet.
 */
export function buildXTweetFromRaw(
  raw: RawTweet,
  usersMap: ReadonlyMap<string, XUser>,
  includedTweetsMap: ReadonlyMap<string, RawTweet>,
  mediaMap: ReadonlyMap<string, RawMedia>,
): XTweet {
  const retweetRef = raw.referenced_tweets?.find((r) => r.type === "retweeted");
  const original = retweetRef ? includedTweetsMap.get(retweetRef.id) : undefined;
  const isRetweet = original !== undefined;

  // For retweets the visible content (text/media/urls/author) comes from
  // the referenced original tweet, while the timeline entry (id,
  // created_at) stays the outer one so since_id tracking still works and
  // the retweet event appears at its actual time in chronological sort.
  const contentSource = original ?? raw;

  const author = resolveXUser(contentSource.author_id, usersMap);
  const retweetedBy =
    isRetweet && raw.author_id !== contentSource.author_id ? resolveXUser(raw.author_id, usersMap) : null;

  return {
    id: raw.id,
    sourceTweetId: contentSource.id,
    text: contentSource.text,
    createdAt: raw.created_at,
    lang: contentSource.lang ?? null,
    author,
    retweetedBy,
    media: mapRawMedia(contentSource.attachments?.media_keys, mediaMap),
    urls: mapRawUrls(contentSource.entities),
  };
}

export class XClient {
  constructor(private readonly bearerToken: string) {}

  async lookupUsers(usernames: readonly string[]): Promise<LookupUsersResult> {
    const unique = Array.from(new Set(usernames.map((u) => u.toLowerCase()))).filter((u) => u.length > 0);
    if (unique.length === 0) {
      return { ok: true, result: { found: new Map(), missing: [] } };
    }

    const found = new Map<string, XUser>();
    const missing = new Set<string>(unique);

    for (let i = 0; i < unique.length; i += USER_LOOKUP_BATCH_SIZE) {
      const batch = unique.slice(i, i + USER_LOOKUP_BATCH_SIZE);
      const url = new URL(`${X_API_BASE}/users/by`);
      url.searchParams.set("usernames", batch.join(","));
      url.searchParams.set("user.fields", "id,username,name,profile_image_url");

      let response: Response;
      try {
        response = await fetch(url, { headers: this.buildHeaders() });
      } catch (error) {
        return {
          ok: false,
          error: { code: "fetch_failed", message: `network error: ${(error as Error).message}` },
        };
      }

      if (!response.ok) {
        const text = await safeReadText(response);
        return { ok: false, error: classifyHttpError(response.status, response.headers, text) };
      }

      let body: RawUsersResponse;
      try {
        body = (await response.json()) as RawUsersResponse;
      } catch (error) {
        return {
          ok: false,
          error: { code: "fetch_failed", message: `invalid JSON from /users/by: ${(error as Error).message}` },
        };
      }

      for (const user of body.data ?? []) {
        const key = user.username.toLowerCase();
        found.set(key, {
          id: user.id,
          username: user.username,
          name: user.name,
          profileImageUrl: normalizeProfileImageUrl(user.profile_image_url),
        });
        missing.delete(key);
      }
    }

    return { ok: true, result: { found, missing: Array.from(missing) } };
  }

  async fetchUserTweets(userId: string, options: FetchUserTweetsOptions = {}): Promise<FetchUserTweetsResult> {
    const {
      sinceId,
      maxResults = DEFAULT_PAGE_SIZE,
      maxPages = DEFAULT_MAX_PAGES,
      includeRetweets = true,
      includeReplies = false,
    } = options;

    const tweets: XTweet[] = [];
    let nextToken: string | undefined;
    let page = 0;

    while (page < maxPages) {
      const url = new URL(`${X_API_BASE}/users/${encodeURIComponent(userId)}/tweets`);
      url.searchParams.set("max_results", String(maxResults));
      url.searchParams.set("tweet.fields", "id,text,created_at,author_id,lang,attachments,entities,referenced_tweets");
      url.searchParams.set(
        "expansions",
        "author_id,attachments.media_keys,referenced_tweets.id,referenced_tweets.id.author_id",
      );
      url.searchParams.set("media.fields", "url,preview_image_url,type");
      url.searchParams.set("user.fields", "id,username,name,profile_image_url");
      const excludes: string[] = [];
      if (!includeRetweets) excludes.push("retweets");
      if (!includeReplies) excludes.push("replies");
      if (excludes.length > 0) {
        url.searchParams.set("exclude", excludes.join(","));
      }
      if (sinceId) {
        url.searchParams.set("since_id", sinceId);
      }
      if (nextToken) {
        url.searchParams.set("pagination_token", nextToken);
      }

      let response: Response;
      try {
        response = await fetch(url, { headers: this.buildHeaders() });
      } catch (error) {
        return {
          ok: false,
          error: { code: "fetch_failed", message: `network error: ${(error as Error).message}` },
        };
      }

      if (!response.ok) {
        const text = await safeReadText(response);
        return { ok: false, error: classifyHttpError(response.status, response.headers, text) };
      }

      let body: RawTweetsResponse;
      try {
        body = (await response.json()) as RawTweetsResponse;
      } catch (error) {
        return {
          ok: false,
          error: {
            code: "fetch_failed",
            message: `invalid JSON from /users/:id/tweets: ${(error as Error).message}`,
          },
        };
      }

      const mediaMap = new Map<string, RawMedia>();
      for (const media of body.includes?.media ?? []) {
        mediaMap.set(media.media_key, media);
      }

      const usersMap = new Map<string, XUser>();
      for (const rawUser of body.includes?.users ?? []) {
        usersMap.set(rawUser.id, {
          id: rawUser.id,
          username: rawUser.username,
          name: rawUser.name,
          profileImageUrl: normalizeProfileImageUrl(rawUser.profile_image_url),
        });
      }

      const includedTweetsMap = new Map<string, RawTweet>();
      for (const includedTweet of body.includes?.tweets ?? []) {
        includedTweetsMap.set(includedTweet.id, includedTweet);
      }

      for (const raw of body.data ?? []) {
        const tweet = buildXTweetFromRaw(raw, usersMap, includedTweetsMap, mediaMap);
        if (tweet) {
          tweets.push(tweet);
        }
      }

      page += 1;
      nextToken = body.meta?.next_token;
      if (!nextToken) {
        break;
      }
    }

    return { ok: true, tweets };
  }

  private buildHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${this.bearerToken}`,
      Accept: "application/json",
    };
  }
}

/**
 * Public shape of {@link XClient}, usable as a dependency-injection type for
 * tests or wrappers that only need the two HTTP methods without the private
 * bearer-token state.
 */
export type XClientApi = Pick<XClient, "lookupUsers" | "fetchUserTweets">;
