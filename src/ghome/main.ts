import { parseArgs as nodeParseArgs } from "node:util";
import type { Device } from "castv2-player";
import { MediaPlayer, Scanner } from "castv2-player";
import { getAllAudioUrls } from "./googleTts.js";

const silentLogger = {
  error: () => {},
  warn: () => {},
  info: () => {},
  debug: () => {},
};

export interface RunOptions {
  text?: string;
  device?: string;
  ip?: string;
  list?: boolean;
}

export interface DeviceInfo {
  name: string;
  host: string;
  port: number;
  type: string;
}

export function parseArgs(argv: string[]): RunOptions {
  const { values, positionals } = nodeParseArgs({
    args: argv.slice(2),
    options: {
      device: { type: "string", short: "d" },
      ip: { type: "string" },
      list: { type: "boolean", short: "l" },
    },
    allowPositionals: true,
  });

  return {
    device: values.device,
    ip: values.ip,
    list: values.list ?? false,
    text: positionals.length > 0 ? positionals.join(" ") : undefined,
  };
}

export function filterDevices(devices: DeviceInfo[], nameFilter: string): DeviceInfo[] {
  const lower = nameFilter.toLowerCase();
  return devices.filter((d) => d.name.toLowerCase().includes(lower));
}

export function discoverDevices(timeoutMs = 5000): Promise<DeviceInfo[]> {
  const ScannerClass = Scanner(silentLogger);
  return new Promise((resolve) => {
    const devices: DeviceInfo[] = [];
    const scanner = new ScannerClass(
      (d: Device) => {
        devices.push({ name: d.name, host: d.host, port: d.port, type: d.type });
      },
      { scanInterval: timeoutMs * 2 },
    );
    setTimeout(() => {
      scanner.destroy();
      resolve(devices);
    }, timeoutMs);
  });
}

export async function speakText(device: DeviceInfo, text: string): Promise<void> {
  const MediaPlayerClass = MediaPlayer(silentLogger);

  // Build a Device-compatible object for direct IP connections
  const connection: Device = {
    id: device.host,
    name: device.name,
    host: device.host,
    port: device.port,
    type: device.type,
    registerForUpdates: (_cb) => {},
  };

  const audioUrls = getAllAudioUrls(text, { lang: "ja", slow: false }).map((r) => r.url);
  const player = new MediaPlayerClass(connection);
  try {
    for (const url of audioUrls) {
      await player.playAnnouncementPromise(url);
    }
  } finally {
    player.close();
  }
}

export async function resolveDevice(options: Pick<RunOptions, "ip" | "device">): Promise<DeviceInfo> {
  const ip = options.ip ?? process.env.GHOME_IP;
  if (ip) {
    return { name: ip, host: ip, port: 8009, type: "unknown" };
  }

  const found = await discoverDevices();
  const filtered = options.device ? filterDevices(found, options.device) : found;

  if (filtered.length === 0) {
    const msg = options.device
      ? `No device found matching "${options.device}". Use --list to see available devices.`
      : "No Google Home devices found on the network. Use --ip to specify a device directly.";
    console.error(JSON.stringify({ success: false, error: msg }));
    process.exit(1);
  }

  if (filtered.length > 1) {
    const names = filtered.map((d) => d.name);
    console.error(
      JSON.stringify({
        success: false,
        error: "Multiple devices found. Use --device to narrow down.",
        devices: names,
      }),
    );
    process.exit(1);
  }

  return filtered[0];
}

export async function run(options: RunOptions): Promise<void> {
  if (options.list) {
    const devices = await discoverDevices();
    console.log(JSON.stringify({ devices }));
    return;
  }

  const { text } = options;
  if (!text) {
    console.error(
      JSON.stringify({
        success: false,
        error: "No text specified. Usage: ghome [--device <name>] [--ip <address>] <text>",
      }),
    );
    process.exit(1);
  }

  const device = await resolveDevice(options);
  await speakText(device, text);
  console.log(JSON.stringify({ success: true, device: device.name, ip: device.host, text }));
}
