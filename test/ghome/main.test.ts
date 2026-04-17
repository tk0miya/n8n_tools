import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveDevice } from "@/ghome/main.js";

describe("resolveDevice", () => {
  it("returns device from --ip", () => {
    const device = resolveDevice({ ip: "192.168.1.100" });
    expect(device).toEqual({ host: "192.168.1.100", port: 8009 });
  });

  describe("with GHOME_IP env var", () => {
    beforeEach(() => {
      process.env.GHOME_IP = "192.168.1.200";
    });

    afterEach(() => {
      delete process.env.GHOME_IP;
    });

    it("returns device from GHOME_IP when --ip is not specified", () => {
      const device = resolveDevice({});
      expect(device).toEqual({ host: "192.168.1.200", port: 8009 });
    });

    it("prefers --ip over GHOME_IP", () => {
      const device = resolveDevice({ ip: "192.168.1.100" });
      expect(device).toEqual({ host: "192.168.1.100", port: 8009 });
    });
  });
});
