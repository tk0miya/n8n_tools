import { describe, expect, it } from "vitest";
import { parseExpirationHeader } from "@/github/tokenExpiry.js";

// ── parseExpirationHeader ─────────────────────────────────

describe("parseExpirationHeader", () => {
  it("parses GitHub expiration header format", () => {
    const result = parseExpirationHeader("2024-06-01 00:00:00 UTC");
    expect(result).toEqual(new Date("2024-06-01T00:00:00Z"));
  });

  it("parses a different date", () => {
    const result = parseExpirationHeader("2025-12-31 23:59:59 UTC");
    expect(result).toEqual(new Date("2025-12-31T23:59:59Z"));
  });

  it("parses header with timezone offset", () => {
    const result = parseExpirationHeader("2027-03-31 00:00:00 +0900");
    expect(result).toEqual(new Date("2027-03-31T00:00:00+0900"));
  });

  it("throws on invalid header format", () => {
    expect(() => parseExpirationHeader("not-a-date")).toThrow("Failed to parse token expiration header");
  });
});
