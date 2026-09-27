import "dotenv/config";
import { parseArgs, run } from "./main.ts";

run(parseArgs(process.argv)).catch((error) => {
  console.error(error);
  process.exit(1);
});
