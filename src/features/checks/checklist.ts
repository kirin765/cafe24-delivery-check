import { toCsv } from "@/features/imports/csv";
import type { CheckRun, Finding, ResolutionNote } from "./types";

export const CHECKLIST_HEADER = [
  "finding_key",
  "mall_id",
  "shop_no",
  "product_no",
  "variant_code",
  "product_name",
  "verdict",
  "verdict_label",
  "reason",
  "matched_rules",
  "actions",
  "evidence_complete",
  "freshness",
  "operator_note",
  "marked_done_at",
];

export function buildChecklistCsv(run: CheckRun, resolutions: ResolutionNote[]): string {
  const notes = new Map(resolutions.map((note) => [note.findingKey, note]));
  const rows = run.findings.map((finding: Finding) => {
    const note = notes.get(finding.key);
    return [
      finding.key,
      finding.mallId,
      finding.shopNo,
      finding.productNo,
      finding.variantCode,
      finding.productName,
      finding.verdict,
      finding.label,
      finding.reason,
      finding.matchedRuleIds.join(" | "),
      finding.actions.join(" | "),
      finding.evidenceComplete ? "yes" : "no",
      finding.freshness,
      note?.note ?? "",
      note?.markedDoneAt ?? "",
    ];
  });
  return toCsv(CHECKLIST_HEADER, rows);
}

export function downloadTextFile(filename: string, text: string, type = "text/csv;charset=utf-8"): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
