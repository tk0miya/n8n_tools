import dedent from "dedent";
import { describe, expect, it } from "vitest";
import { analyzeCooldownSources } from "#github/packageCooldownParser.js";

describe("analyzeCooldownSources", () => {
  it("passes when no manifest is present", () => {
    expect(analyzeCooldownSources({ packageJson: null, npmrc: null, gemfile: null })).toEqual({
      noPackageCooldown: false,
    });
  });

  it("passes when npm cooldown is set", () => {
    expect(analyzeCooldownSources({ packageJson: "{}", npmrc: "min-release-age=7\n", gemfile: null })).toEqual({
      noPackageCooldown: false,
    });
  });

  it("flags when package.json exists but .npmrc is missing", () => {
    expect(analyzeCooldownSources({ packageJson: "{}", npmrc: null, gemfile: null })).toEqual({
      noPackageCooldown: true,
    });
  });

  it("flags when .npmrc lacks min-release-age", () => {
    expect(analyzeCooldownSources({ packageJson: "{}", npmrc: "save-exact=true\n", gemfile: null })).toEqual({
      noPackageCooldown: true,
    });
  });

  it("flags when min-release-age is zero", () => {
    expect(analyzeCooldownSources({ packageJson: "{}", npmrc: "min-release-age=0\n", gemfile: null })).toEqual({
      noPackageCooldown: true,
    });
  });

  it("passes when the Gemfile declares a cooldown", () => {
    const gemfile = dedent`
      source "https://rubygems.org", cooldown: 7
      gem "rails"
    `;
    expect(analyzeCooldownSources({ packageJson: null, npmrc: null, gemfile })).toEqual({
      noPackageCooldown: false,
    });
  });

  it("flags when the Gemfile has no cooldown", () => {
    const gemfile = dedent`
      source "https://rubygems.org"
      gem "rails"
    `;
    expect(analyzeCooldownSources({ packageJson: null, npmrc: null, gemfile })).toEqual({
      noPackageCooldown: true,
    });
  });

  it("flags when one of two ecosystems is missing cooldown", () => {
    const gemfile = `source "https://rubygems.org", cooldown: 7\n`;
    expect(analyzeCooldownSources({ packageJson: "{}", npmrc: null, gemfile })).toEqual({
      noPackageCooldown: true,
    });
  });

  it("passes when both ecosystems have cooldown", () => {
    const gemfile = `source "https://rubygems.org", cooldown: 7\n`;
    expect(analyzeCooldownSources({ packageJson: "{}", npmrc: "min-release-age=7\n", gemfile })).toEqual({
      noPackageCooldown: false,
    });
  });
});
