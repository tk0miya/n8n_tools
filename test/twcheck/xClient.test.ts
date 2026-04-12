import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeProfileImageUrl, parseRateLimitHeaders, XClient } from "@/twcheck/xClient.js";

type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function errorResponse(status: number, body = "error body", headers: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain", ...headers },
  });
}

describe("normalizeProfileImageUrl", () => {
  it("replaces _normal suffix with _400x400", () => {
    const input = "https://pbs.twimg.com/profile_images/1/avatar_normal.jpg";
    expect(normalizeProfileImageUrl(input)).toBe("https://pbs.twimg.com/profile_images/1/avatar_400x400.jpg");
  });

  it("handles png extension", () => {
    expect(normalizeProfileImageUrl("https://example/a_normal.png")).toBe("https://example/a_400x400.png");
  });

  it("returns null for null/undefined", () => {
    expect(normalizeProfileImageUrl(null)).toBeNull();
    expect(normalizeProfileImageUrl(undefined)).toBeNull();
    expect(normalizeProfileImageUrl("")).toBeNull();
  });

  it("leaves URLs without _normal unchanged", () => {
    const url = "https://pbs.twimg.com/profile_images/1/avatar_400x400.jpg";
    expect(normalizeProfileImageUrl(url)).toBe(url);
  });
});

describe("parseRateLimitHeaders", () => {
  it("parses x-rate-limit-reset as unix seconds", () => {
    const headers = new Headers({ "x-rate-limit-reset": "1712000000" });
    expect(parseRateLimitHeaders(headers)).toEqual({ resetAt: new Date(1712000000 * 1000).toISOString() });
  });

  it("returns empty object when header missing", () => {
    expect(parseRateLimitHeaders(new Headers())).toEqual({});
  });

  it("returns empty object when header is not numeric", () => {
    const headers = new Headers({ "x-rate-limit-reset": "oops" });
    expect(parseRateLimitHeaders(headers)).toEqual({});
  });
});

describe("XClient.lookupUsers", () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls /users/by with user.fields including profile_image_url", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [
          {
            id: "1",
            username: "elonmusk",
            name: "Elon",
            profile_image_url: "https://pbs.twimg.com/profile_images/1/e_normal.jpg",
          },
        ],
      }),
    );
    const client = new XClient("token");
    const result = await client.lookupUsers(["ElonMusk"]);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unexpected error");
    const user = result.result.found.get("elonmusk");
    expect(user).toEqual({
      id: "1",
      username: "elonmusk",
      name: "Elon",
      profileImageUrl: "https://pbs.twimg.com/profile_images/1/e_400x400.jpg",
    });
    expect(result.result.missing).toEqual([]);

    const calledUrl = fetchMock.mock.calls[0][0] as URL;
    expect(calledUrl.searchParams.get("usernames")).toBe("elonmusk");
    expect(calledUrl.searchParams.get("user.fields")).toContain("profile_image_url");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token");
  });

  it("reports missing usernames from the server response", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [{ id: "1", username: "exists", name: "Exists", profile_image_url: "https://a/b_normal.jpg" }],
      }),
    );
    const client = new XClient("token");
    const result = await client.lookupUsers(["exists", "ghost"]);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unexpected error");
    expect(result.result.missing).toEqual(["ghost"]);
  });

  it("batches usernames into chunks of 100", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ data: [] })));
    const usernames = Array.from({ length: 150 }, (_, i) => `user${i}`);
    const client = new XClient("token");
    await client.lookupUsers(usernames);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstUrl = fetchMock.mock.calls[0][0] as URL;
    const secondUrl = fetchMock.mock.calls[1][0] as URL;
    expect(firstUrl.searchParams.get("usernames")?.split(",").length).toBe(100);
    expect(secondUrl.searchParams.get("usernames")?.split(",").length).toBe(50);
  });

  it("returns unauthorized on 401", async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(401, "unauthorized"));
    const client = new XClient("token");
    const result = await client.lookupUsers(["elonmusk"]);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unexpected ok");
    expect(result.error.code).toBe("unauthorized");
  });

  it("returns empty result for empty input without calling fetch", async () => {
    const client = new XClient("token");
    const result = await client.lookupUsers([]);
    expect(result.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("XClient.fetchUserTweets", () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("passes since_id, max_results and default excludes (replies only by default)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [], meta: { result_count: 0 } }));
    const client = new XClient("token");
    const result = await client.fetchUserTweets("123", { sinceId: "999" });
    expect(result.ok).toBe(true);

    const url = fetchMock.mock.calls[0][0] as URL;
    expect(url.pathname).toBe("/2/users/123/tweets");
    expect(url.searchParams.get("since_id")).toBe("999");
    expect(url.searchParams.get("max_results")).toBe("100");
    expect(url.searchParams.get("exclude")).toBe("replies");
    const expansions = url.searchParams.get("expansions") ?? "";
    expect(expansions).toContain("author_id");
    expect(expansions).toContain("attachments.media_keys");
    expect(expansions).toContain("referenced_tweets.id");
    expect(expansions).toContain("referenced_tweets.id.author_id");
    const tweetFields = url.searchParams.get("tweet.fields") ?? "";
    expect(tweetFields).toContain("entities");
    expect(tweetFields).toContain("referenced_tweets");
    expect(url.searchParams.get("user.fields")).toContain("profile_image_url");
  });

  it("omits exclude when both include flags are set", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [], meta: { result_count: 0 } }));
    const client = new XClient("token");
    await client.fetchUserTweets("123", { includeRetweets: true, includeReplies: true });
    const url = fetchMock.mock.calls[0][0] as URL;
    expect(url.searchParams.get("exclude")).toBeNull();
  });

  it("maps media entries via media_key expansion", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [
          {
            id: "100",
            text: "hi",
            created_at: "2026-04-11T00:00:00.000Z",
            author_id: "1",
            lang: "en",
            attachments: { media_keys: ["m1"] },
          },
        ],
        includes: {
          media: [{ media_key: "m1", type: "photo", url: "https://pbs.twimg.com/media/m1.jpg" }],
          users: [{ id: "1", username: "elonmusk", name: "Elon", profile_image_url: "https://pbs/e_normal.jpg" }],
        },
        meta: { result_count: 1 },
      }),
    );
    const client = new XClient("token");
    const result = await client.fetchUserTweets("1");
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unexpected error");
    expect(result.tweets).toHaveLength(1);
    expect(result.tweets[0].media).toEqual([
      {
        type: "photo",
        url: "https://pbs.twimg.com/media/m1.jpg",
        previewImageUrl: null,
        mediaKey: "m1",
      },
    ]);
    expect(result.tweets[0].lang).toBe("en");
    expect(result.tweets[0].author.username).toBe("elonmusk");
    expect(result.tweets[0].retweetedBy).toBeNull();
    expect(result.tweets[0].sourceTweetId).toBe("100");
  });

  it("maps entities.urls to XTweet.urls", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [
          {
            id: "100",
            text: "check this out https://t.co/abc",
            created_at: "2026-04-11T00:00:00.000Z",
            author_id: "1",
            entities: {
              urls: [
                {
                  url: "https://t.co/abc",
                  expanded_url: "https://example.com/page",
                  display_url: "example.com/page",
                },
                {
                  url: "https://t.co/no-expand",
                },
              ],
            },
          },
        ],
        meta: { result_count: 1 },
      }),
    );
    const client = new XClient("token");
    const result = await client.fetchUserTweets("1");
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unexpected error");
    expect(result.tweets[0].urls).toEqual([
      {
        url: "https://t.co/abc",
        expandedUrl: "https://example.com/page",
        displayUrl: "example.com/page",
      },
    ]);
  });

  it("returns an empty urls array when the tweet has no entities field", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [
          {
            id: "100",
            text: "no links",
            created_at: "2026-04-11T00:00:00.000Z",
            author_id: "1",
          },
        ],
        meta: { result_count: 1 },
      }),
    );
    const client = new XClient("token");
    const result = await client.fetchUserTweets("1");
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unexpected error");
    expect(result.tweets[0].urls).toEqual([]);
  });

  it("resolves retweets from includes and swaps the author with the original poster", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [
          {
            id: "1700",
            text: "RT @sama: this will be truncat…",
            created_at: "2026-04-11T12:00:00.000Z",
            author_id: "elon_id",
            referenced_tweets: [{ type: "retweeted", id: "1500" }],
          },
        ],
        includes: {
          users: [
            { id: "elon_id", username: "elonmusk", name: "Elon", profile_image_url: "https://pbs/e_normal.jpg" },
            { id: "sama_id", username: "sama", name: "Sam", profile_image_url: "https://pbs/s_normal.jpg" },
          ],
          tweets: [
            {
              id: "1500",
              text: "full original text from sama",
              created_at: "2026-04-10T09:00:00.000Z",
              author_id: "sama_id",
              lang: "en",
              entities: {
                urls: [
                  {
                    url: "https://t.co/link",
                    expanded_url: "https://example.com/page",
                    display_url: "example.com/page",
                  },
                ],
              },
              attachments: { media_keys: ["m9"] },
            },
          ],
          media: [{ media_key: "m9", type: "photo", url: "https://pbs.twimg.com/media/m9.jpg" }],
        },
        meta: { result_count: 1 },
      }),
    );

    const client = new XClient("token");
    const result = await client.fetchUserTweets("elon_id", { includeRetweets: true });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unexpected error");
    expect(result.tweets).toHaveLength(1);
    const tweet = result.tweets[0];
    expect(tweet.id).toBe("1700"); // retweet entry id stays as the output id for since_id tracking
    expect(tweet.sourceTweetId).toBe("1500"); // original id for URL generation
    expect(tweet.text).toBe("full original text from sama");
    expect(tweet.createdAt).toBe("2026-04-11T12:00:00.000Z"); // retweet time, not original
    expect(tweet.lang).toBe("en");
    expect(tweet.author.username).toBe("sama");
    expect(tweet.retweetedBy?.username).toBe("elonmusk");
    expect(tweet.media.map((m) => m.mediaKey)).toEqual(["m9"]);
    expect(tweet.urls.map((u) => u.expandedUrl)).toEqual(["https://example.com/page"]);
  });

  it("falls back to the retweeter as author when the referenced tweet is missing from includes", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [
          {
            id: "1700",
            text: "RT @sama: truncated…",
            created_at: "2026-04-11T12:00:00.000Z",
            author_id: "elon_id",
            referenced_tweets: [{ type: "retweeted", id: "1500" }],
          },
        ],
        includes: {
          users: [{ id: "elon_id", username: "elonmusk", name: "Elon", profile_image_url: "https://pbs/e_normal.jpg" }],
        },
        meta: { result_count: 1 },
      }),
    );

    const client = new XClient("token");
    const result = await client.fetchUserTweets("elon_id", { includeRetweets: true });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unexpected error");
    const tweet = result.tweets[0];
    expect(tweet.author.username).toBe("elonmusk");
    expect(tweet.retweetedBy).toBeNull();
    expect(tweet.text).toBe("RT @sama: truncated…");
    expect(tweet.sourceTweetId).toBe("1700");
  });

  it("follows pagination_token up to maxPages", async () => {
    const page1Tweets = Array.from({ length: 5 }, (_, i) => ({
      id: `${100 + i}`,
      text: `t${i}`,
      created_at: "2026-04-11T00:00:00.000Z",
      author_id: "1",
    }));
    const page2Tweets = Array.from({ length: 3 }, (_, i) => ({
      id: `${200 + i}`,
      text: `t${i}`,
      created_at: "2026-04-11T00:00:00.000Z",
      author_id: "1",
    }));
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: page1Tweets, meta: { result_count: 5, next_token: "tok-1" } }))
      .mockResolvedValueOnce(jsonResponse({ data: page2Tweets, meta: { result_count: 3 } }));

    const client = new XClient("token");
    const result = await client.fetchUserTweets("1", { maxResults: 5, maxPages: 3 });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unexpected error");
    expect(result.tweets).toHaveLength(8);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstUrl = fetchMock.mock.calls[0][0] as URL;
    const secondUrl = fetchMock.mock.calls[1][0] as URL;
    expect(firstUrl.searchParams.get("pagination_token")).toBeNull();
    expect(secondUrl.searchParams.get("pagination_token")).toBe("tok-1");
  });

  it("stops paginating when maxPages is reached", async () => {
    const makePage = () => ({
      data: Array.from({ length: 5 }, (_, i) => ({
        id: `${i}`,
        text: "t",
        created_at: "2026-04-11T00:00:00.000Z",
        author_id: "1",
      })),
      meta: { result_count: 5, next_token: "more" },
    });
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(makePage())));

    const client = new XClient("token");
    const result = await client.fetchUserTweets("1", { maxResults: 5, maxPages: 2 });
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("classifies 429 as rate_limited and extracts reset time", async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(429, "slow down", { "x-rate-limit-reset": "1712000000" }));
    const client = new XClient("token");
    const result = await client.fetchUserTweets("1");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unexpected ok");
    expect(result.error.code).toBe("rate_limited");
    expect(result.error.resetAt).toBe(new Date(1712000000 * 1000).toISOString());
  });

  it("classifies 404 as account_not_found", async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(404));
    const client = new XClient("token");
    const result = await client.fetchUserTweets("1");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unexpected ok");
    expect(result.error.code).toBe("account_not_found");
  });

  it("classifies 500 as fetch_failed", async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500));
    const client = new XClient("token");
    const result = await client.fetchUserTweets("1");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unexpected ok");
    expect(result.error.code).toBe("fetch_failed");
  });

  it("maps network errors to fetch_failed", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const client = new XClient("token");
    const result = await client.fetchUserTweets("1");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unexpected ok");
    expect(result.error.code).toBe("fetch_failed");
    expect(result.error.message).toContain("ECONNREFUSED");
  });
});
