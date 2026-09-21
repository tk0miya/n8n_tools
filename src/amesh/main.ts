import { parseArgs as nodeParseArgs } from "node:util";
import sharp from "sharp";

const BASE_URL = "https://tokyo-ame.jwa.or.jp";
const MAP_PATH = "/map/map000.jpg";
const MASK_PATH = "/map/msk000.png";
const MESH_UNIT_MINUTES = 5;

export interface RunOptions {
  now: Date;
}

export interface RunOutput {
  timestamp: string;
  content_type: "image/png";
  image_base64: string;
}

export function parseArgs(argv: string[]): RunOptions {
  nodeParseArgs({ args: argv.slice(2), options: {}, allowPositionals: false });
  return { now: new Date() };
}

// 雨分布画像は5分刻みで更新され、生成直後は存在しないことがあるため、
// 1周期分遡ってから5分単位に切り捨てた時刻を対象にする。
export function computeMeshTimestamp(now: Date): string {
  const shifted = new Date(now.getTime() - MESH_UNIT_MINUTES * 60 * 1000);
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(shifted);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const minute = Math.floor(Number(get("minute")) / MESH_UNIT_MINUTES) * MESH_UNIT_MINUTES;

  return `${get("year")}${get("month")}${get("day")}${get("hour")}${String(minute).padStart(2, "0")}`;
}

export function buildMeshUrl(timestamp: string): string {
  return `${BASE_URL}/mesh/000/${timestamp}.gif`;
}

export function buildMapUrl(): string {
  return `${BASE_URL}${MAP_PATH}`;
}

export function buildMaskUrl(): string {
  return `${BASE_URL}${MASK_PATH}`;
}

export async function fetchImage(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; amesh-checker/1.0)",
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} fetching ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

// 地形図をベースに、雨量分布・県境/地名の順でレイヤーを重ねる。
export async function composeImage(map: Buffer, mesh: Buffer, mask: Buffer): Promise<Buffer> {
  return sharp(map)
    .composite([{ input: mesh }, { input: mask }])
    .png()
    .toBuffer();
}

export async function run(options: RunOptions): Promise<number> {
  const timestamp = computeMeshTimestamp(options.now);

  const [map, mesh, mask] = await Promise.all([
    fetchImage(buildMapUrl()),
    fetchImage(buildMeshUrl(timestamp)),
    fetchImage(buildMaskUrl()),
  ]);

  const composed = await composeImage(map, mesh, mask);

  const output: RunOutput = {
    timestamp,
    content_type: "image/png",
    image_base64: composed.toString("base64"),
  };
  console.log(JSON.stringify(output));

  return 0;
}
