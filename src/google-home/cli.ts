import { parseArgs, run } from "./main.js";

run(parseArgs(process.argv))
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
