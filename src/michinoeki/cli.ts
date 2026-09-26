import "dotenv/config";
import type { RunOptions } from "./main.js";
import { parseArgs, run } from "./main.js";

async function main(): Promise<void> {
  let options: RunOptions;
  try {
    options = parseArgs(process.argv);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
    return;
  }

  // Avoid process.exit(): it can truncate a large stdout write when stdout is
  // piped, since Node may not have finished flushing the write before the
  // process exits.
  process.exitCode = await run(options);
}

main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
