// Sample runner: replace this file with your own script.
// Runs inside mcr.microsoft.com/playwright container via:
//   /files/n8n_tools/node_modules/.bin/tsx /files/n8n_tools/src/playwright-runner/cli.ts
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();

try {
  const response = await page.goto("https://www.google.com");
  console.log(JSON.stringify({ success: true, code: response?.status() ?? 0 }));
} catch (err) {
  console.log(JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
} finally {
  try {
    await browser.close();
  } catch {
    // ignore close errors; result already written to stdout
  }
}
