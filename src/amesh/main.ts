import { parseArgs as nodeParseArgs } from "node:util";
import sharp from "sharp";

const BASE_URL = "https://tokyo-ame.jwa.or.jp";
const MAP_PATH = "/map/map000.jpg";
const MASK_PATH = "/map/msk000.png";
const MESH_UNIT_MINUTES = 5;
const ANIMATION_DURATION_MINUTES = 120;
const ANIMATION_FRAME_COUNT = ANIMATION_DURATION_MINUTES / MESH_UNIT_MINUTES;
const ANIMATION_FRAME_DELAY_MS = 200;

export interface RunOptions {
  now: Date;
  animate: boolean;
}

export interface RunOutput {
  timestamp: string;
  filename: string;
  content_type: "image/png" | "image/gif";
  image_base64: string;
}

export function parseArgs(argv: string[]): RunOptions {
  const { values } = nodeParseArgs({
    args: argv.slice(2),
    options: { animate: { type: "boolean", default: false } },
    allowPositionals: false,
  });
  return { now: new Date(), animate: values.animate ?? false };
}

function formatMeshTimestamp(date: Date): string {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const minute = Math.floor(Number(get("minute")) / MESH_UNIT_MINUTES) * MESH_UNIT_MINUTES;

  return `${get("year")}${get("month")}${get("day")}${get("hour")}${String(minute).padStart(2, "0")}`;
}

// 雨分布画像は5分刻みで更新され、生成直後は存在しないことがあるため、
// 1周期分遡ってから5分単位に切り捨てた時刻を対象にする。
export function computeMeshTimestamp(now: Date): string {
  const shifted = new Date(now.getTime() - MESH_UNIT_MINUTES * 60 * 1000);
  return formatMeshTimestamp(shifted);
}

// computeMeshTimestamp が指す時刻を最新フレームとして、5分刻みで過去に遡った
// タイムスタンプ列を古い順に返す。
export function computeMeshTimestamps(now: Date, count: number): string[] {
  const latestShifted = now.getTime() - MESH_UNIT_MINUTES * 60 * 1000;
  const timestamps: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    timestamps.push(formatMeshTimestamp(new Date(latestShifted - i * MESH_UNIT_MINUTES * 60 * 1000)));
  }
  return timestamps;
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

// 合成済みフレーム(同一サイズのPNG)を時系列順に結合し、ループ再生するアニメーションGIFにする。
export async function composeAnimation(frames: Buffer[]): Promise<Buffer> {
  return sharp(frames, { join: { animated: true } })
    .gif({ loop: 0, delay: frames.map(() => ANIMATION_FRAME_DELAY_MS) })
    .toBuffer();
}

async function runSingle(now: Date): Promise<RunOutput> {
  const timestamp = computeMeshTimestamp(now);

  const [map, mesh, mask] = await Promise.all([
    fetchImage(buildMapUrl()),
    fetchImage(buildMeshUrl(timestamp)),
    fetchImage(buildMaskUrl()),
  ]);

  const composed = await composeImage(map, mesh, mask);

  return {
    timestamp,
    filename: `amesh_${timestamp}.png`,
    content_type: "image/png",
    image_base64: composed.toString("base64"),
  };
}

async function runAnimated(now: Date): Promise<RunOutput> {
  const timestamps = computeMeshTimestamps(now, ANIMATION_FRAME_COUNT);

  const [map, mask] = await Promise.all([fetchImage(buildMapUrl()), fetchImage(buildMaskUrl())]);

  // mesh画像24枚を一度に並列fetchすると外部サーバーへ同時多数のリクエストを
  // 送ることになるため、1枚ずつ直列にfetchする。
  const meshes: Buffer[] = [];
  for (const timestamp of timestamps) {
    meshes.push(await fetchImage(buildMeshUrl(timestamp)));
  }

  const frames = await Promise.all(meshes.map((mesh) => composeImage(map, mesh, mask)));
  const animation = await composeAnimation(frames);

  const timestamp = timestamps[timestamps.length - 1];

  return {
    timestamp,
    filename: `amesh_${timestamp}.gif`,
    content_type: "image/gif",
    image_base64: animation.toString("base64"),
  };
}

export async function run(options: RunOptions): Promise<number> {
  const output = options.animate ? await runAnimated(options.now) : await runSingle(options.now);
  console.log(JSON.stringify(output));

  return 0;
}
