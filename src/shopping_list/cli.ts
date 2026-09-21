import "dotenv/config";
import { parseArgs, run } from "./main.js";

run(parseArgs(process.argv))
  .then((code) => {
    // Avoid process.exit(): it can truncate a large stdout write when stdout
    // is piped, since Node may not have finished flushing the write before
    // the process exits.
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
