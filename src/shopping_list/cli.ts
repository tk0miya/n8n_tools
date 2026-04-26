import "dotenv/config";
import { parseArgs, run } from "./main.js";

run(parseArgs(process.argv))
  .then((code) => {
    process.exit(code);
  })
  .catch((error) => {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
