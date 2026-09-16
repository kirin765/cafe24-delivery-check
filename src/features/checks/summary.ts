import type { Finding, Verdict } from "./types";

export const VERDICT_ORDER: Verdict[] = [
  "missing",
  "disabled",
  "ambiguous",
  "unknown",
  "configured",
  "not_applicable",
];

export function summarize(findings: Finding[]): Record<Verdict, number> {
  const counts: Record<Verdict, number> = {
    configured: 0,
    missing: 0,
    disabled: 0,
    ambiguous: 0,
    unknown: 0,
    not_applicable: 0,
  };
  for (const finding of findings) counts[finding.verdict] += 1;
  return counts;
}

export function needsAttention(verdict: Verdict): boolean {
  return verdict === "missing" || verdict === "disabled" || verdict === "ambiguous" || verdict === "unknown";
}
