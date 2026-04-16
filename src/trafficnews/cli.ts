import "dotenv/config";
import type { RunOptions } from "./main.js";
import { parseArgs, run } from "./main.js";

async function main(): Promise<void> {
  let options: RunOptions;
  try {
    options = parseArgs(process.argv);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  const code = await run(options);
  process.exit(code);
}

main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
