import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DeviceInfo } from "@/ghome/main.js";
import { filterDevices, resolveDevice } from "@/ghome/main.js";

describe("resolveDevice", () => {
  it("returns device from --ip without discovery", async () => {
    const device = await resolveDevice({ ip: "192.168.1.100" });
    expect(device).toEqual({ name: "192.168.1.100", host: "192.168.1.100", port: 8009, type: "unknown" });
  });

  describe("with GHOME_IP env var", () => {
    beforeEach(() => {
      process.env.GHOME_IP = "192.168.1.200";
    });

    afterEach(() => {
      delete process.env.GHOME_IP;
    });

    it("returns device from GHOME_IP when --ip is not specified", async () => {
      const device = await resolveDevice({});
      expect(device).toEqual({ name: "192.168.1.200", host: "192.168.1.200", port: 8009, type: "unknown" });
    });

    it("prefers --ip over GHOME_IP", async () => {
      const device = await resolveDevice({ ip: "192.168.1.100" });
      expect(device).toEqual({ name: "192.168.1.100", host: "192.168.1.100", port: 8009, type: "unknown" });
    });
  });
});

describe("filterDevices", () => {
  const devices: DeviceInfo[] = [
    { name: "リビングのGoogle Home", host: "192.168.1.10", port: 8009, type: "Chromecast Audio" },
    { name: "キッチンのGoogle Home", host: "192.168.1.11", port: 8009, type: "Chromecast Audio" },
    { name: "寝室のChromecast", host: "192.168.1.12", port: 8009, type: "Chromecast" },
  ];

  it("returns matching devices by partial name", () => {
    const result = filterDevices(devices, "リビング");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("リビングのGoogle Home");
  });

  it("is case-insensitive for ASCII", () => {
    const result = filterDevices(devices, "chromecast");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("寝室のChromecast");
  });

  it("returns multiple matches when filter is broad", () => {
    const result = filterDevices(devices, "Google");
    expect(result).toHaveLength(2);
  });

  it("returns empty array when no match", () => {
    const result = filterDevices(devices, "書斎");
    expect(result).toHaveLength(0);
  });
});
