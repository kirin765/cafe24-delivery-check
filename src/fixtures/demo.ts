import type { CatalogEntry, DeliveryRule, MallEvidence } from "@/features/checks/types";
import { toCsv } from "@/features/imports/csv";

export type DemoScenario = "complete" | "incomplete" | "stale";

export const demoCatalog: CatalogEntry[] = [
  {
    mallId: "demo-mall-a",
    shopNo: "1",
    productNo: "1001",
    productName: "실전 전자책 (PDF)",
    digitalConfirmed: "yes",
    saleActive: "yes",
  },
  {
    mallId: "demo-mall-a",
    shopNo: "1",
    productNo: "1002",
    productName: "노션 업무 템플릿",
    digitalConfirmed: "yes",
    saleActive: "yes",
  },
  {
    mallId: "demo-mall-a",
    shopNo: "1",
    productNo: "1003",
    variantCode: "V-1Y",
    productName: "온라인 강의 수강권 (1년)",
    digitalConfirmed: "yes",
    saleActive: "yes",
  },
  {
    mallId: "demo-mall-a",
    shopNo: "1",
    productNo: "1003",
    variantCode: "V-6M",
    productName: "온라인 강의 수강권 (6개월)",
    digitalConfirmed: "yes",
    saleActive: "yes",
  },
  {
    mallId: "demo-mall-a",
    shopNo: "1",
    productNo: "1004",
    variantCode: "V-BASIC",
    productName: "디자인 소스 팩 (베이직)",
    digitalConfirmed: "yes",
    saleActive: "no",
  },
  {
    mallId: "demo-mall-a",
    shopNo: "1",
    productNo: "9001",
    productName: "아크릴 키링 (실물)",
    digitalConfirmed: "no",
    saleActive: "yes",
  },
  {
    mallId: "demo-mall-b",
    shopNo: "1",
    productNo: "1001",
    productName: "실전 전자책 (PDF)",
    digitalConfirmed: "yes",
    saleActive: "yes",
  },
  {
    mallId: "demo-mall-b",
    shopNo: "1",
    productNo: "2001",
    productName: "사운드 팩",
    digitalConfirmed: "unknown",
    saleActive: "yes",
  },
  {
    mallId: "demo-mall-b",
    shopNo: "1",
    productNo: "2002",
    variantCode: "V-1",
    productName: "이모티콘 세트",
    digitalConfirmed: "yes",
    saleActive: "yes",
  },
];

export const demoRules: DeliveryRule[] = [
  {
    mallId: "demo-mall-a",
    shopNo: "1",
    productNo: "1001",
    ruleId: "R-A-1001",
    scope: "product",
    status: "active",
    channel: "이메일",
    configuredAt: "2026-08-20",
    collectedAt: "2026-09-10",
    source: "데모용 합성 설정 대조",
  },
  {
    mallId: "demo-mall-a",
    shopNo: "1",
    productNo: "1003",
    ruleId: "R-A-1003",
    scope: "product",
    status: "active",
    channel: "다운로드 링크",
    configuredAt: "2026-07-15",
    collectedAt: "2026-09-10",
    source: "데모용 합성 설정 대조",
  },
  {
    mallId: "demo-mall-a",
    shopNo: "1",
    productNo: "1004",
    variantCode: "V-BASIC",
    ruleId: "R-A-1004",
    scope: "variant",
    status: "inactive",
    channel: "다운로드 링크",
    configuredAt: "2026-07-01",
    collectedAt: "2026-09-10",
    source: "데모용 합성 설정 대조",
  },
  {
    mallId: "demo-mall-b",
    shopNo: "1",
    productNo: "2002",
    variantCode: "V-1",
    ruleId: "R-B-2002",
    scope: "variant",
    status: "active",
    channel: "다운로드 링크",
    configuredAt: "2026-09-01",
    collectedAt: "2026-09-05",
    source: "데모용 합성 설정 대조 (일부)",
  },
];

const evidenceA: MallEvidence = {
  mallId: "demo-mall-a",
  complete: true,
  productRuleCoversVariants: "unknown",
  snapshotFrom: "2026-09-01",
  snapshotTo: "2026-09-10",
  collectedAt: "2026-09-10",
  confirmedBy: "운영자 (데모)",
  source: "데모용 합성 자료",
};

const evidenceB: MallEvidence = {
  mallId: "demo-mall-b",
  complete: false,
  productRuleCoversVariants: "no",
  snapshotFrom: "2026-09-05",
  snapshotTo: "2026-09-05",
  collectedAt: "2026-09-05",
  confirmedBy: "운영자 (데모)",
  source: "데모용 합성 자료 (일부 상품만)",
};

export function demoEvidence(scenario: DemoScenario = "complete"): MallEvidence[] {
  if (scenario === "incomplete") {
    return [{ ...evidenceA, complete: false }, evidenceB];
  }
  if (scenario === "stale") {
    return [{ ...evidenceA, collectedAt: "2025-12-01", snapshotFrom: "2025-11-01", snapshotTo: "2025-12-01" }, evidenceB];
  }
  return [evidenceA, evidenceB];
}

export const CATALOG_HEADER = [
  "mall_id",
  "shop_no",
  "product_no",
  "variant_code",
  "product_name",
  "digital_confirmed",
  "sale_active",
];

export const RULES_HEADER = [
  "mall_id",
  "shop_no",
  "product_no",
  "variant_code",
  "rule_id",
  "scope",
  "active",
  "channel",
  "configured_at",
  "collected_at",
  "source",
];

export const EVIDENCE_HEADER = [
  "mall_id",
  "complete",
  "product_rule_covers_variants",
  "snapshot_from",
  "snapshot_to",
  "collected_at",
  "confirmed_by",
  "source",
];

export function catalogToCsv(entries: CatalogEntry[] = demoCatalog): string {
  return toCsv(
    CATALOG_HEADER,
    entries.map((entry) => [
      entry.mallId,
      entry.shopNo,
      entry.productNo,
      entry.variantCode,
      entry.productName,
      entry.digitalConfirmed,
      entry.saleActive,
    ]),
  );
}

export function rulesToCsv(rules: DeliveryRule[] = demoRules): string {
  return toCsv(
    RULES_HEADER,
    rules.map((rule) => [
      rule.mallId,
      rule.shopNo,
      rule.productNo,
      rule.variantCode,
      rule.ruleId,
      rule.scope,
      rule.status,
      rule.channel,
      rule.configuredAt,
      rule.collectedAt,
      rule.source,
    ]),
  );
}

export function evidenceToCsv(evidence: MallEvidence[] = demoEvidence()): string {
  return toCsv(
    EVIDENCE_HEADER,
    evidence.map((item) => [
      item.mallId,
      item.complete ? "yes" : "no",
      item.productRuleCoversVariants,
      item.snapshotFrom,
      item.snapshotTo,
      item.collectedAt,
      item.confirmedBy,
      item.source,
    ]),
  );
}
