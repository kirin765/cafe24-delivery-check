import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "./csv";
import { hasBlockingErrors, parseCatalogCsv, parseImportBundle } from "./parse";
import type { ImportIssue } from "./types";

function issues(): ImportIssue[] {
  return [];
}

describe("parseCsv", () => {
  it("따옴표 안의 쉼표와 줄바꿈을 보존한다", () => {
    const rows = parseCsv('a,b\n"x, y","line1\nline2"\n');
    expect(rows[1]).toEqual(["x, y", "line1\nline2"]);
  });

  it("따옴표 이스케이프를 처리한다", () => {
    const rows = parseCsv('a\n"그는 ""좋다""고 말했다"\n');
    expect(rows[1][0]).toBe('그는 "좋다"고 말했다');
  });

  it("toCsv와 parseCsv가 왕복한다", () => {
    const csv = toCsv(["a", "b"], [["x, y", 'z"z']]);
    expect(parseCsv(csv)).toEqual([
      ["a", "b"],
      ["x, y", 'z"z'],
    ]);
  });
});

describe("parseCatalogCsv", () => {
  const header = "mall_id,shop_no,product_no,variant_code,product_name,digital_confirmed,sale_active";

  it("필수 열이 없으면 오류를 기록한다", () => {
    const list = issues();
    const entries = parseCatalogCsv("mall_id,shop_no,product_no,product_name\nm,1,1,책", list);
    expect(entries).toHaveLength(0);
    expect(list.some((issue) => issue.level === "error" && issue.column === "digital_confirmed")).toBe(true);
    expect(hasBlockingErrors(list)).toBe(true);
  });

  it("유효한 행을 파싱한다", () => {
    const list = issues();
    const entries = parseCatalogCsv(
      `${header}\nmall-a,1,1001,,전자책,yes,no\n`,
      list,
    );
    expect(entries[0]).toMatchObject({
      mallId: "mall-a",
      productNo: "1001",
      variantCode: undefined,
      digitalConfirmed: "yes",
      saleActive: "no",
    });
    expect(hasBlockingErrors(list)).toBe(false);
  });

  it("잘못된 확인 값을 오류로 처리한다", () => {
    const list = issues();
    parseCatalogCsv(`${header}\nmall-a,1,1001,,전자책,maybe,yes\n`, list);
    expect(list.some((issue) => issue.level === "error" && issue.column === "digital_confirmed")).toBe(true);
  });
});

describe("parseImportBundle", () => {
  it("variant 범위 규칙에 옵션 코드가 없으면 오류를 기록한다", () => {
    const bundle = parseImportBundle({
      catalog: "mall_id,shop_no,product_no,variant_code,product_name,digital_confirmed,sale_active\nm,1,1,,책,yes,yes\n",
      rules: "mall_id,shop_no,product_no,variant_code,rule_id,scope,active\nm,1,1,,R1,variant,active\n",
      evidence: "mall_id,complete\nm,yes\n",
    });
    expect(bundle.issues.some((issue) => issue.file === "rules" && issue.column === "variant_code")).toBe(true);
    expect(hasBlockingErrors(bundle.issues)).toBe(true);
  });

  it("근거의 상품→옵션 적용 값을 삼상태로 파싱한다", () => {
    const bundle = parseImportBundle({
      catalog: "mall_id,shop_no,product_no,variant_code,product_name,digital_confirmed,sale_active\n",
      rules: "mall_id,shop_no,product_no,variant_code,rule_id,scope,active\n",
      evidence:
        "mall_id,complete,product_rule_covers_variants,collected_at,source,confirmed_by\nm,yes,no,2026-09-10,src,tester\n",
    });
    expect(bundle.evidence[0]).toMatchObject({
      mallId: "m",
      complete: true,
      productRuleCoversVariants: "no",
      collectedAt: "2026-09-10",
      confirmedBy: "tester",
    });
  });

  it("CSV 누락 열을 오류로 보고한다", () => {
    const bundle = parseImportBundle({ catalog: "", rules: "", evidence: "" });
    expect(bundle.issues.every((issue) => issue.level === "error")).toBe(true);
    expect(bundle.issues.length).toBeGreaterThan(0);
  });
});
