import { describe, expect, it } from "vitest";
import { computeDaysUntilExpiry, toCheckTokenResult } from "@/ghtoken/main.js";

// ── toCheckTokenResult ────────────────────────────────────

describe("toCheckTokenResult", () => {
  it("builds result for a token with expiration", () => {
    const expiration = new Date("2024-06-15T00:00:00Z");
    const result = toCheckTokenResult(expiration);
    expect(result).toEqual({
      expiration: "2024-06-15T00:00:00.000Z",
      daysUntilExpiry: expect.any(Number),
    });
  });

  it("builds result for a token without expiration", () => {
    const result = toCheckTokenResult(null);
    expect(result).toEqual({
      expiration: null,
      daysUntilExpiry: null,
    });
  });
});

// ── computeDaysUntilExpiry ────────────────────────────────

describe("computeDaysUntilExpiry", () => {
  it("returns positive days when token has not expired", () => {
    const expiration = new Date("2024-06-30T00:00:00Z");
    const now = new Date("2024-06-01T00:00:00Z");
    expect(computeDaysUntilExpiry(expiration, now)).toBe(29);
  });

  it("returns 0 on the day of expiry", () => {
    const expiration = new Date("2024-06-01T12:00:00Z");
    const now = new Date("2024-06-01T00:00:00Z");
    expect(computeDaysUntilExpiry(expiration, now)).toBe(0);
  });

  it("returns negative days when token has expired", () => {
    const expiration = new Date("2024-06-01T00:00:00Z");
    const now = new Date("2024-06-05T00:00:00Z");
    expect(computeDaysUntilExpiry(expiration, now)).toBe(-4);
  });

  it("returns 30 for exactly one month", () => {
    const expiration = new Date("2024-07-01T00:00:00Z");
    const now = new Date("2024-06-01T00:00:00Z");
    expect(computeDaysUntilExpiry(expiration, now)).toBe(30);
  });
});
