import { type BlockKitBlock, buildBlocks } from "./blockkit.js";
import { GasClient, type GasClientApi } from "./gas.js";
import { splitItems, stripMentions } from "./mention.js";

export type Subcommand = "dispatch" | "update" | "purge";

export interface RunOptions {
  subcommand: Subcommand;
}

export interface DispatchListOutput {
  success: true;
  kind: "list";
  blocks: BlockKitBlock[];
}

export interface DispatchAddOutput {
  success: true;
  kind: "added";
  count: number;
}

export type DispatchOutput = DispatchListOutput | DispatchAddOutput;

export interface UpdateOutput {
  success: true;
  updated: number;
}

export interface PurgeOutput {
  success: true;
  deleted: number;
}

export function parseArgs(argv: string[]): RunOptions {
  const args = argv.slice(2);
  const [subcommand] = args;

  switch (subcommand) {
    case "dispatch":
    case "update":
    case "purge":
      return { subcommand };
    default:
      throw new Error(`Unknown subcommand: ${subcommand ?? "(missing)"}. Use one of: dispatch, update, purge`);
  }
}

export function extractTextFromSlackEvents(payload: unknown): string {
  const events = Array.isArray(payload) ? payload : [payload];
  return events
    .map((event) => {
      if (event && typeof event === "object" && "text" in event) {
        const text = (event as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      }
      return "";
    })
    .filter((t) => t.length > 0)
    .join("\n");
}

function getGasUrl(): string {
  const url = process.env.SHOPPING_LIST_GAS_URL;
  if (!url) {
    throw new Error("SHOPPING_LIST_GAS_URL is not set");
  }
  return url;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export async function runDispatch(payload: unknown, client: GasClientApi): Promise<DispatchOutput> {
  const text = extractTextFromSlackEvents(payload);
  const argument = stripMentions(text);
  if (argument === "") {
    const items = await client.list();
    return { success: true, kind: "list", blocks: buildBlocks(items) };
  }
  const items = splitItems(argument);
  await client.add(items);
  return { success: true, kind: "added", count: items.length };
}

export function toUpdateRequests(stateMap: Record<string, boolean>) {
  return Object.entries(stateMap).map(([id, checked]) => ({
    id,
    checked,
  }));
}

export async function runUpdate(stateMap: Record<string, boolean>, client: GasClientApi): Promise<UpdateOutput> {
  const updates = toUpdateRequests(stateMap);
  await client.update(updates);
  return { success: true, updated: updates.length };
}

export async function runPurge(client: GasClientApi): Promise<PurgeOutput> {
  const deleted = await client.purge();
  return { success: true, deleted };
}

export async function run(options: RunOptions): Promise<number> {
  const client = new GasClient(getGasUrl());

  switch (options.subcommand) {
    case "dispatch": {
      const raw = (await readStdin()).trim();
      if (!raw) throw new Error("stdin is empty");
      let payload: unknown;
      try {
        payload = JSON.parse(raw);
      } catch (error) {
        throw new Error(`invalid JSON on stdin: ${error instanceof Error ? error.message : String(error)}`);
      }
      const output = await runDispatch(payload, client);
      console.log(JSON.stringify(output));
      return 0;
    }
    case "update": {
      const raw = (await readStdin()).trim();
      if (!raw) throw new Error("stdin is empty");
      let stateMap: Record<string, boolean>;
      try {
        stateMap = JSON.parse(raw) as Record<string, boolean>;
      } catch (error) {
        throw new Error(`invalid JSON on stdin: ${error instanceof Error ? error.message : String(error)}`);
      }
      const output = await runUpdate(stateMap, client);
      console.log(JSON.stringify(output));
      return 0;
    }
    case "purge": {
      const output = await runPurge(client);
      console.log(JSON.stringify(output));
      return 0;
    }
  }
}
