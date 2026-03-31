import { run } from "./ghscan/main.js";

const debug = process.argv.includes("--debug");
run({ debug }).catch((error) => {
  console.error(error);
  process.exit(1);
});
