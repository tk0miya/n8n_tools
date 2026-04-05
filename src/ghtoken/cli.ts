import "dotenv/config";
import { run } from "./main.js";

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
