import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const { chromium } = await import("playwright-core");

const root = fileURLToPath(new URL("../", import.meta.url));
const here = path.join(root, "store-assets");
const outDir = path.join(root, "public", "store");
const CHROMIUM = process.env.CHROMIUM_PATH ?? "/usr/bin/chromium";

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 860, height: 600 },
    deviceScaleFactor: 2,
  });
  await page.goto(pathToFileURL(path.join(here, "detail-images.html")).href);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  for (const [id, name] of [
    ["d1", "detail-01.png"],
    ["d2", "detail-02.png"],
    ["d3", "detail-03.png"],
  ]) {
    await page.locator(`#${id}`).screenshot({ path: path.join(outDir, name) });
    console.log(`${name} ✓`);
  }
} finally {
  await browser.close();
}
