import { parseArgs as nodeParseArgs } from "node:util";
import { Client, DefaultMediaReceiver } from "castv2-client";
import { getAllAudioUrls } from "./googleTts.js";

export interface RunOptions {
  text?: string;
  ip?: string;
}

export interface DeviceInfo {
  host: string;
  port: number;
}

export function parseArgs(argv: string[]): RunOptions {
  const { values, positionals } = nodeParseArgs({
    args: argv.slice(2),
    options: {
      ip: { type: "string" },
    },
    allowPositionals: true,
  });

  return {
    ip: values.ip,
    text: positionals.length > 0 ? positionals.join(" ") : undefined,
  };
}

export function resolveDevice(options: Pick<RunOptions, "ip">): DeviceInfo {
  const ip = options.ip ?? process.env.GHOME_IP;
  if (!ip) {
    console.error(JSON.stringify({ success: false, error: "No device specified. Use --ip or set GHOME_IP." }));
    process.exit(1);
  }
  return { host: ip, port: 8009 };
}

export async function speakText(device: DeviceInfo, text: string): Promise<void> {
  const audioUrls = getAllAudioUrls(text, { lang: "ja", slow: false }).map((r) => r.url);

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => {
      if (!settled) {
        settled = true;
        fn();
      }
    };

    const client = new Client();
    client.on("error", (err) => settle(() => reject(err)));

    client.connect({ host: device.host, port: device.port }, () => {
      client.launch(DefaultMediaReceiver, (err, player) => {
        if (err) {
          settle(() => {
            client.close();
            reject(err);
          });
          return;
        }

        let index = 0;

        const playNext = () => {
          if (index >= audioUrls.length) {
            settle(() => {
              client.close();
              resolve();
            });
            return;
          }

          const url = audioUrls[index++];
          player.load({ contentId: url, contentType: "audio/mp3" }, { autoplay: true }, (loadErr) => {
            if (loadErr) {
              settle(() => {
                client.close();
                reject(loadErr);
              });
              return;
            }

            let hasStarted = false;
            const onStatus = (status: { playerState: string }) => {
              if (status.playerState === "PLAYING") hasStarted = true;
              if (hasStarted && status.playerState === "IDLE") {
                player.removeListener("status", onStatus);
                playNext();
              }
            };
            player.on("status", onStatus);
          });
        };

        playNext();
      });
    });
  });
}

export async function run(options: RunOptions): Promise<void> {
  const { text } = options;
  if (!text) {
    console.error(
      JSON.stringify({
        success: false,
        error: "No text specified. Usage: ghome [--ip <address>] <text>",
      }),
    );
    process.exit(1);
  }

  const device = resolveDevice(options);
  await speakText(device, text);
  console.log(JSON.stringify({ success: true, ip: device.host, text }));
}
