import { toCsv } from "@/features/imports/csv";
import { EVIDENCE_HEADER, RULES_HEADER } from "@/features/imports/schema";
import type { CatalogEntry, MallEvidence } from "./types";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildRulesTemplateCsv(
  entries: CatalogEntry[],
  collectedAt: string = today(),
): string {
  const targets = entries.filter((entry) => entry.digitalConfirmed !== "no");
  return toCsv(
    RULES_HEADER,
    targets.map((entry) => [
      entry.mallId,
      entry.shopNo,
      entry.productNo,
      entry.variantCode,
      `TBD-${entry.mallId}-${entry.productNo}${entry.variantCode ? `-${entry.variantCode}` : ""}`,
      entry.variantCode ? "variant" : "product",
      "unknown",
      "",
      "",
      collectedAt,
      "운영자 외부 앱 확인",
    ]),
  );
}

export function buildEvidenceTemplateCsv(
  evidence: MallEvidence[],
  collectedAt: string = today(),
): string {
  return toCsv(
    EVIDENCE_HEADER,
    evidence.map((item) => [
      item.mallId,
      "no",
      item.productRuleCoversVariants ?? "unknown",
      "",
      "",
      collectedAt,
      "",
      "",
    ]),
  );
}
