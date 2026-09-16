import type {
  ComparisonChange,
  ComparisonRow,
  Finding,
  ResolutionNote,
  Verdict,
} from "./types";

function changeOf(previous: Verdict | undefined, current: Verdict | undefined): ComparisonChange {
  if (previous === undefined && current !== undefined) return "new";
  if (current === undefined) return "gone";
  if (previous === current) return "unchanged";
  if (current === "configured" && previous !== "configured") return "resolved";
  if (previous === "configured" && current !== "configured") return "regressed";
  return "changed";
}

export function compareFindings(
  previous: Finding[],
  current: Finding[],
  resolutions: ResolutionNote[] = [],
): ComparisonRow[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const finding of [...previous, ...current]) {
    if (seen.has(finding.key)) continue;
    seen.add(finding.key);
    keys.push(finding.key);
  }

  const previousByKey = new Map(previous.map((finding) => [finding.key, finding]));
  const currentByKey = new Map(current.map((finding) => [finding.key, finding]));
  const resolutionByKey = new Map(resolutions.map((note) => [note.findingKey, note]));

  return keys.map((key) => {
    const before = previousByKey.get(key);
    const after = currentByKey.get(key);
    const resolution = resolutionByKey.get(key);
    const change = changeOf(before?.verdict, after?.verdict);
    const subject = after ?? before;
    return {
      key,
      mallId: subject?.mallId ?? "",
      shopNo: subject?.shopNo ?? "",
      productNo: subject?.productNo ?? "",
      variantCode: subject?.variantCode,
      productName: subject?.productName ?? "",
      previous: before?.verdict,
      current: after?.verdict,
      change,
      manuallyChecked: Boolean(resolution),
      verifiedByNewSnapshot: change === "resolved",
      note: resolution?.note,
    };
  });
}

export const CHANGE_LABELS: Record<ComparisonChange, string> = {
  unchanged: "변동 없음",
  resolved: "새 자료로 설정 확인",
  regressed: "설정 사라짐",
  changed: "판정 변경",
  new: "신규 항목",
  gone: "목록에서 제외",
};
