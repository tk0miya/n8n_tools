import { parseArgs, run } from "./main.js";

run(parseArgs(process.argv)).catch((error) => {
  console.error(error);
  process.exit(1);
});
