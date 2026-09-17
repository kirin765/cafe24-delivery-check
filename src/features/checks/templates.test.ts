import { describe, expect, it } from "vitest";
import { parseEvidenceCsv, parseRulesCsv } from "@/features/imports/parse";
import type { ImportIssue } from "@/features/imports/types";
import { buildEvidenceTemplateCsv, buildRulesTemplateCsv } from "./templates";
import type { CatalogEntry } from "./types";

const catalog: CatalogEntry[] = [
  {
    mallId: "m",
    shopNo: "1",
    productNo: "D1",
    productName: "전자책",
    digitalConfirmed: "yes",
    saleActive: "yes",
  },
  {
    mallId: "m",
    shopNo: "1",
    productNo: "D2",
    variantCode: "V1",
    productName: "강의",
    digitalConfirmed: "yes",
    saleActive: "yes",
  },
  {
    mallId: "m",
    shopNo: "1",
    productNo: "P1",
    productName: "실물",
    digitalConfirmed: "no",
    saleActive: "yes",
  },
];

describe("buildRulesTemplateCsv", () => {
  it("디지털 상품만 넣고 옵션 범위를 채운다", () => {
    const issues: ImportIssue[] = [];
    const rules = parseRulesCsv(buildRulesTemplateCsv(catalog, "2026-09-17"), issues);
    expect(rules).toHaveLength(2);
    expect(rules[0]).toMatchObject({ productNo: "D1", scope: "product", status: "unknown" });
    expect(rules[1]).toMatchObject({ productNo: "D2", scope: "variant", status: "unknown" });
    expect(issues.filter((issue) => issue.level === "error")).toHaveLength(0);
  });
});

describe("buildEvidenceTemplateCsv", () => {
  it("근거 서식은 완전성 미확인(no)으로 시작한다", () => {
    const issues: ImportIssue[] = [];
    const evidence = parseEvidenceCsv(
      buildEvidenceTemplateCsv([{ mallId: "m", complete: true }], "2026-09-17"),
      issues,
    );
    expect(evidence[0]).toMatchObject({ mallId: "m", complete: false });
    expect(issues.filter((issue) => issue.level === "error")).toHaveLength(0);
  });
});
