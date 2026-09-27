import "dotenv/config";
import { run } from "./main.ts";

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
