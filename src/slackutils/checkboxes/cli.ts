import { parseCheckboxPayload } from "./main.js";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

async function main(): Promise<void> {
  const raw = (await readStdin()).trim();
  if (!raw) {
    console.error("Error: stdin is empty");
    process.exit(1);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    console.error(`Error: invalid JSON on stdin: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  console.log(JSON.stringify(parseCheckboxPayload(payload)));
}

main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
