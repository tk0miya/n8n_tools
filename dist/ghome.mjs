// src/ghome/main.ts
import { parseArgs as nodeParseArgs } from "node:util";
import { MediaPlayer, Scanner } from "castv2-player";
import { getAllAudioUrls } from "google-tts-api";
var silentLogger = {
  error: () => {
  },
  warn: () => {
  },
  info: () => {
  },
  debug: () => {
  }
};
function parseArgs(argv) {
  const { values, positionals } = nodeParseArgs({
    args: argv.slice(2),
    options: {
      device: { type: "string", short: "d" },
      ip: { type: "string" },
      list: { type: "boolean", short: "l" }
    },
    allowPositionals: true
  });
  return {
    device: values.device,
    ip: values.ip,
    list: values.list ?? false,
    text: positionals.length > 0 ? positionals.join(" ") : void 0
  };
}
function filterDevices(devices, nameFilter) {
  const lower = nameFilter.toLowerCase();
  return devices.filter((d) => d.name.toLowerCase().includes(lower));
}
function discoverDevices(timeoutMs = 5e3) {
  const ScannerClass = Scanner(silentLogger);
  return new Promise((resolve) => {
    const devices = [];
    const scanner = new ScannerClass(
      (d) => {
        devices.push({ name: d.name, host: d.host, port: d.port, type: d.type });
      },
      { scanInterval: timeoutMs * 2 }
    );
    setTimeout(() => {
      scanner.destroy();
      resolve(devices);
    }, timeoutMs);
  });
}
async function speakText(device, text) {
  const MediaPlayerClass = MediaPlayer(silentLogger);
  const connection = {
    id: device.host,
    name: device.name,
    host: device.host,
    port: device.port,
    type: device.type,
    registerForUpdates: (_cb) => {
    }
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
async function resolveDevice(options) {
  if (options.ip) {
    return { name: options.ip, host: options.ip, port: 8009, type: "unknown" };
  }
  const found = await discoverDevices();
  const filtered = options.device ? filterDevices(found, options.device) : found;
  if (filtered.length === 0) {
    const msg = options.device ? `No device found matching "${options.device}". Use --list to see available devices.` : "No Google Home devices found on the network. Use --ip to specify a device directly.";
    console.error(JSON.stringify({ success: false, error: msg }));
    process.exit(1);
  }
  if (filtered.length > 1) {
    const names = filtered.map((d) => d.name);
    console.error(
      JSON.stringify({
        success: false,
        error: "Multiple devices found. Use --device to narrow down.",
        devices: names
      })
    );
    process.exit(1);
  }
  return filtered[0];
}
async function run(options) {
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
        error: "No text specified. Usage: ghome [--device <name>] [--ip <address>] <text>"
      })
    );
    process.exit(1);
  }
  const device = await resolveDevice(options);
  await speakText(device, text);
  console.log(JSON.stringify({ success: true, device: device.name, ip: device.host, text }));
}

// src/ghome/cli.ts
run(parseArgs(process.argv)).then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
