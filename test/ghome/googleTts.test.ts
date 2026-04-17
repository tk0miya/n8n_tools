import { describe, expect, it } from "vitest";
import { getAllAudioUrls } from "@/ghome/googleTts.js";

describe("getAllAudioUrls", () => {
  it("returns a single URL for short text", () => {
    const results = getAllAudioUrls("Hello", { lang: "en" });
    expect(results).toHaveLength(1);
    expect(results[0].shortText).toBe("Hello");
    expect(results[0].url).toContain("translate.google.com/translate_tts");
    expect(results[0].url).toContain("tl=en");
    expect(results[0].url).toContain("client=tw-ob");
  });

  it("splits text longer than 200 characters at word boundaries", () => {
    const word = "あ".repeat(100);
    const text = `${word} ${word} ${word}`;
    const results = getAllAudioUrls(text, { lang: "ja" });
    expect(results.length).toBeGreaterThan(1);
    for (const r of results) {
      expect(r.shortText.length).toBeLessThanOrEqual(200);
    }
  });

  it("uses slow speed when slow=true", () => {
    const results = getAllAudioUrls("test", { slow: true });
    expect(results[0].url).toContain("ttsspeed=0.24");
  });

  it("uses normal speed by default", () => {
    const results = getAllAudioUrls("test", {});
    expect(results[0].url).toContain("ttsspeed=1");
  });

  it("uses custom host", () => {
    const results = getAllAudioUrls("test", { host: "https://custom.host" });
    expect(results[0].url.startsWith("https://custom.host/translate_tts")).toBe(true);
  });
});
