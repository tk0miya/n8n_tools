import { describe, expect, it } from "vitest";
import { splitItems, stripMentions } from "@/shopping_list/mention.js";

describe("stripMentions", () => {
  it("removes a single user mention and trims", () => {
    expect(stripMentions("<@U123> 牛乳")).toBe("牛乳");
  });

  it("removes multiple mentions anywhere in the text", () => {
    expect(stripMentions("hi <@U1> and <@U2> please buy milk")).toBe("hi  and  please buy milk");
  });

  it("returns empty string when only a mention is present", () => {
    expect(stripMentions("<@U123>")).toBe("");
  });

  it("returns empty string when only whitespace is present", () => {
    expect(stripMentions("   \n\t ")).toBe("");
  });

  it("preserves embedded newlines after trimming", () => {
    expect(stripMentions("<@U123>\n牛乳\nパン\n")).toBe("牛乳\nパン");
  });
});

describe("splitItems", () => {
  it("splits by newlines and trims each line", () => {
    expect(splitItems("牛乳\n パン \n卵")).toEqual(["牛乳", "パン", "卵"]);
  });

  it("removes empty lines", () => {
    expect(splitItems("牛乳\n\n  \nパン")).toEqual(["牛乳", "パン"]);
  });

  it("returns an empty array for an empty string", () => {
    expect(splitItems("")).toEqual([]);
  });
});
