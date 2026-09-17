import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const { chromium } = await import("playwright-core");

const root = fileURLToPath(new URL("../", import.meta.url));
const APP_URL = process.env.APP_URL ?? "https://cafe24-delivery-check.vercel.app";
const CHROMIUM = process.env.CHROMIUM_PATH ?? "/usr/bin/chromium";
const SHOTS = path.join(root, "store-assets", "screenshots");
const PC = { width: 1920, height: 1080 };
const MOBILE = { width: 360, height: 640 };
const PC_ZOOM = Number(process.env.PC_ZOOM ?? 1.7);

async function main() {
  await mkdir(SHOTS, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });

  try {
    const context = await browser.newContext({ viewport: PC });
    const page = await context.newPage();
    const shot = (name) => page.screenshot({ path: path.join(SHOTS, name) });
    const zoomPc = async () => {
      await page.evaluate((factor) => {
        document.documentElement.style.zoom = String(factor);
      }, PC_ZOOM);
      await page.waitForTimeout(200);
    };

    await page.goto(`${APP_URL}/`, { waitUntil: "networkidle" });
    await page.evaluate(() => window.localStorage.clear());

    await page.goto(`${APP_URL}/checks/new`, { waitUntil: "networkidle" });
    await page.getByTestId("load-demo").click();
    await page.waitForTimeout(400);
    await zoomPc();
    await shot("pc-01-new-check.png");
    console.log("pc-01-new-check.png ✓");

    await page.goto(`${APP_URL}/demo`, { waitUntil: "networkidle" });
    await zoomPc();
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(200);
    await shot("pc-02-demo-results.png");
    console.log("pc-02-demo-results.png ✓");

    await page.goto(`${APP_URL}/checks/new`, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      document.documentElement.style.zoom = "";
    });
    await page.getByTestId("load-demo").click();
    await page.waitForFunction(() => {
      const button = document.querySelector('[data-testid="run-check"]');
      return button instanceof HTMLButtonElement && !button.disabled;
    });
    await page.getByTestId("run-check").click();
    await page.waitForURL(/\/checks\/[^/]+$/);
    await page.locator('[data-testid="finding-row"]').first().waitFor();
    await zoomPc();
    await page.evaluate(() => window.scrollTo(0, 380));
    await page.waitForTimeout(200);
    await shot("pc-03-check-result.png");
    console.log("pc-03-check-result.png ✓");
    await context.close();

    const mobile = await browser.newContext({ viewport: MOBILE });
    const mpage = await mobile.newPage();
    const mshot = (name) => mpage.screenshot({ path: path.join(SHOTS, name) });

    await mpage.goto(`${APP_URL}/`, { waitUntil: "networkidle" });
    await mpage.evaluate(() => window.localStorage.clear());

    await mpage.goto(`${APP_URL}/guide`, { waitUntil: "networkidle" });
    await mshot("mo-01-guide.png");
    console.log("mo-01-guide.png ✓");

    await mpage.goto(`${APP_URL}/demo`, { waitUntil: "networkidle" });
    await mshot("mo-02-demo.png");
    console.log("mo-02-demo.png ✓");

    await mpage.goto(`${APP_URL}/checks/new`, { waitUntil: "networkidle" });
    await mpage.getByTestId("load-demo").click();
    await mpage.waitForFunction(() => {
      const button = document.querySelector('[data-testid="run-check"]');
      return button instanceof HTMLButtonElement && !button.disabled;
    });
    await mpage.getByTestId("run-check").click();
    await mpage.waitForURL(/\/checks\/[^/]+$/);
    await mpage.locator('[data-testid="finding-row"]').first().waitFor();
    await mshot("mo-03-check-result.png");
    console.log("mo-03-check-result.png ✓");
    await mobile.close();

    for (const [source, output, size] of [
      ["cover.html", "cover.png", { width: 1200, height: 675 }],
      ["cover-store.html", "cover-store.png", { width: 444, height: 320 }],
    ]) {
      const coverPage = await browser.newPage({ viewport: size });
      await coverPage.goto(pathToFileURL(path.join(root, "store-assets", source)).href);
      await coverPage.evaluate(() => document.fonts.ready);
      await coverPage.waitForTimeout(200);
      await coverPage.screenshot({ path: path.join(root, "store-assets", output) });
      await coverPage.close();
      console.log(`${output} ✓`);
    }
  } finally {
    await browser.close();
  }

  const files = [
    "screenshots/pc-01-new-check.png",
    "screenshots/pc-02-demo-results.png",
    "screenshots/pc-03-check-result.png",
    "screenshots/mo-01-guide.png",
    "screenshots/mo-02-demo.png",
    "screenshots/mo-03-check-result.png",
    "cover.png",
    "cover-store.png",
  ];
  let oversize = false;
  for (const file of files) {
    const info = await stat(path.join(root, "store-assets", file));
    const mb = info.size / 1024 / 1024;
    if (mb >= 1) oversize = true;
    console.log(`${file.padEnd(38)} ${(info.size / 1024).toFixed(0).padStart(5)}KB${mb >= 1 ? "  OVER 1MB" : ""}`);
  }
  if (oversize) {
    console.error("스토어 업로드 한도(1MB)를 넘는 파일이 있습니다.");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
