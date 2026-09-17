import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import test, { after, before } from "node:test";
import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3211";
const CHROME_PATH = process.env.CHROME_PATH ?? "/usr/bin/chromium";
const MISSING_KEY = "demo-mall-a::1::1002::";

let browser;
let page;

before(async () => {
  browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  const context = await browser.newContext();
  page = await context.newPage();
  await page.goto(`${BASE_URL}/`);
  await page.evaluate(() => window.localStorage.clear());
});

after(async () => {
  await browser?.close();
});

async function waitForSummary(verdict, expected) {
  await page.waitForFunction(
    ({ verdict, expected }) => {
      const element = document.querySelector(
        `[data-testid="summary-count"][data-verdict="${verdict}"] [data-testid="summary-count-value"]`,
      );
      return element?.textContent?.trim() === String(expected);
    },
    { verdict, expected },
    { timeout: 10_000 },
  );
}

test("홈 화면이 범위 안내와 함께 로드된다", async () => {
  await page.goto(`${BASE_URL}/`);
  await page.getByRole("heading", { name: "디지털 상품 발송 설정 점검" }).waitFor();
  await page.getByText("실제 발송 검증 아님", { exact: false }).first().waitFor();
  await page.getByRole("link", { name: "합성 자료 데모 보기" }).waitFor();
});

test("상품 export CSV를 업로드해 상품 목록으로 변환한다", async () => {
  await page.goto(`${BASE_URL}/checks/new`);
  const csv = [
    "상품코드,자체 상품코드,진열상태,판매상태,상품분류 번호,상품명,판매가,세분류",
    'P0000101,"","Y","Y","29","샘플 타월","5000.00","eBook"',
    'P0000102,"","Y","N","29","샘플 컵","3000.00","실물"',
  ].join("\n");
  await page.getByTestId("product-export-file").setInputFiles({
    name: "cafe24-product-export.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv, "utf8"),
  });
  await page.getByTestId("export-mall-id").waitFor();
  await page.getByTestId("export-mall-id").fill("onnurimun");
  await page.getByTestId("export-digital-column").selectOption("세분류");
  await page.getByTestId("export-digital-values").fill("eBook");
  await page.getByTestId("apply-export").click();
  await page.getByTestId("export-applied").waitFor();

  const catalog = await page.getByTestId("csv-input-catalog").inputValue();
  assert.match(catalog, /onnurimun,1,P0000101,,샘플 타월,yes,yes/);
  assert.match(catalog, /onnurimun,1,P0000102,,샘플 컵,no,no/);
  assert.match(catalog, /digital_confirmed/);
});

test("개인정보처리방침 페이지가 열린다", async () => {
  await page.goto(`${BASE_URL}/privacy`);
  await page.getByRole("heading", { name: "개인정보처리방침", level: 1 }).waitFor();
  await page.getByText("수집하지 않는 정보").waitFor();
});

test("사용 안내 페이지가 열린다", async () => {
  await page.goto(`${BASE_URL}/guide`);
  await page.getByRole("heading", { name: "사용 안내", level: 1 }).waitFor();
  await page.getByRole("heading", { name: "4단계로 점검하기" }).waitFor();
  await page.getByText("발송 규칙 없음", { exact: false }).first().waitFor();
});

test("Cafe24 미연결 시 안내를 보여준다", async () => {
  await page.goto(`${BASE_URL}/checks/new`);
  await page.getByTestId("cafe24-load").click();
  await page.getByTestId("cafe24-message").waitFor();
  assert.match(await page.getByTestId("cafe24-message").textContent(), /연결되어 있지 않습니다/);
});

test("데모에서 자료 상태를 전환하면 판정이 바뀐다", async () => {
  await page.goto(`${BASE_URL}/demo`);
  await waitForSummary("missing", 1);
  await waitForSummary("unknown", 2);
  await waitForSummary("configured", 2);

  await page.getByTestId("scenario-incomplete").click();
  await waitForSummary("missing", 0);
  await waitForSummary("unknown", 3);

  await page.getByTestId("scenario-stale").click();
  await waitForSummary("missing", 0);
  await waitForSummary("unknown", 7);
  await waitForSummary("configured", 1);
});

test("새 점검을 실행하면 몰별 판정이 표시되고 업로드 요청이 없다", async () => {
  const writes = [];
  const listener = (request) => {
    if (request.method() === "POST" || request.method() === "PUT" || request.method() === "PATCH") {
      writes.push(`${request.method()} ${request.url()}`);
    }
  };
  page.on("request", listener);

  await page.goto(`${BASE_URL}/checks/new`);
  await page.getByTestId("load-demo").click();
  await page.waitForFunction(() => {
    const button = document.querySelector('[data-testid="run-check"]');
    return button instanceof HTMLButtonElement && !button.disabled;
  });
  await page.getByTestId("run-check").click();
  await page.waitForURL(/\/checks\/[^/]+$/);

  await page.locator('[data-testid="finding-row"]').first().waitFor();
  assert.equal(await page.locator('[data-testid="finding-row"]').count(), 9);

  const badges = (verdict) =>
    page.locator(`[data-testid="verdict-badge"][data-verdict="${verdict}"]`).count();
  assert.equal(await badges("configured"), 2);
  assert.equal(await badges("missing"), 1);
  assert.equal(await badges("not_applicable"), 1);

  page.off("request", listener);
  assert.deepEqual(writes, []);
});

test("체크리스트 CSV를 내려받을 수 있다", async () => {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("download-checklist").click(),
  ]);
  assert.match(download.suggestedFilename(), /\.csv$/);
  const path = await download.path();
  const content = await readFile(path, "utf8");
  assert.match(content, /operator_note/);
  assert.match(content, /demo-mall-a::1::1002::/);
  assert.match(content, /실제 발송 검증|설정 확인/);
});

test("규칙/근거 확인 서식을 내려받는다", async () => {
  const [rules] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("download-rules-template").click(),
  ]);
  const rulesText = await readFile(await rules.path(), "utf8");
  assert.match(rulesText, /TBD-demo-mall-a-1002/);
  assert.match(rulesText, /,unknown,/);

  const [evidence] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("download-evidence-template").click(),
  ]);
  const evidenceText = await readFile(await evidence.path(), "utf8");
  assert.match(evidenceText, /demo-mall-a,no,/);
});

test("수동 메모는 저장되지만 판정을 바꾸지 않는다", async () => {
  const note = page.locator(`[data-testid="note-input"][data-key="${MISSING_KEY}"]`);
  await note.fill("외부 앱에서 직접 수정함");
  await page.locator(`[data-testid="save-note"][data-key="${MISSING_KEY}"]`).click();
  await page.getByText("메모됨 · 검증 아님").first().waitFor();
  assert.equal(
    await page.locator(`[data-testid="finding-row"][data-key="${MISSING_KEY}"]`).getAttribute("data-verdict"),
    "missing",
  );
});

test("새 snapshot 비교로 메모와 새 자료 확인을 구분한다", async () => {
  await page.getByTestId("fill-current").click();
  await page.getByTestId("run-recheck").click();
  await page.locator('[data-testid="comparison-row"]').first().waitFor();
  assert.equal(
    await page.locator('[data-testid="comparison-row"][data-change="unchanged"]').count(),
    9,
  );

  const missingRow = page.locator(`[data-testid="comparison-row"][data-key="${MISSING_KEY}"]`);
  assert.match(await missingRow.textContent(), /있음/);

  const rules = page.getByTestId("recheck-rules");
  const current = await rules.inputValue();
  await rules.fill(
    `${current.trimEnd()}\ndemo-mall-a,1,1002,,R-A-1002,product,active,이메일,2026-09-15,2026-09-16,e2e\n`,
  );
  await page.getByTestId("run-recheck").click();
  await page.waitForFunction(
    (key) =>
      document
        .querySelector(`[data-testid="comparison-row"][data-key="${key}"]`)
        ?.getAttribute("data-change") === "resolved",
    MISSING_KEY,
    { timeout: 10_000 },
  );

  const previousUrl = page.url();
  await page.getByTestId("save-new-run").click();
  await page.waitForFunction((before) => window.location.href !== before, previousUrl, {
    timeout: 10_000,
  });
  await page.getByRole("heading", { name: /\(재점검\)/ }).waitFor();
  await page.locator('[data-testid="finding-row"]').first().waitFor();
  await page.waitForFunction(
    () =>
      document.querySelectorAll('[data-testid="verdict-badge"][data-verdict="configured"]').length === 3,
    undefined,
    { timeout: 10_000 },
  );
});

test("알 수 없는 점검 id는 안내 문구를 보여준다", async () => {
  await page.goto(`${BASE_URL}/checks/does-not-exist`);
  await page.getByText("저장된 점검을 불러오지 못했습니다", { exact: false }).waitFor();
});
