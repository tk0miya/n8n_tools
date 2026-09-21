import "dotenv/config";
import { parseArgs, run } from "./main.js";

run(parseArgs(process.argv))
  .then(() => {
    // Avoid process.exit(): it can truncate a large stdout write when stdout
    // is piped, since Node may not have finished flushing the write before
    // the process exits.
    process.exitCode = 0;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
