import type { Finding } from "@/features/checks/types";
import { VerdictBadge } from "./VerdictBadge";

function targetLabel(finding: Finding): string {
  const parts = [`상품 ${finding.productNo}`];
  if (finding.variantCode) parts.push(`옵션 ${finding.variantCode}`);
  return parts.join(" · ");
}

export function FindingsTable({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) {
    return <p className="text-sm text-slate-500">표시할 항목이 없습니다.</p>;
  }

  const malls = [...new Set(findings.map((finding) => finding.mallId))];

  return (
    <div className="space-y-4">
      {malls.map((mallId) => (
        <div key={mallId}>
          <h3 className="mb-1 text-xs font-semibold text-slate-500">몰 {mallId}</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="py-2 pr-3">상품/옵션</th>
                  <th className="py-2 pr-3">판정</th>
                  <th className="py-2 pr-3">이유</th>
                  <th className="py-2 pr-3">근거 규칙</th>
                  <th className="py-2">다음 확인</th>
                </tr>
              </thead>
              <tbody>
                {findings
                  .filter((finding) => finding.mallId === mallId)
                  .map((finding) => (
                    <tr key={finding.key} className="border-b border-slate-100 align-top">
                      <td className="py-3 pr-3">
                        <div className="font-medium text-slate-900">{finding.productName}</div>
                        <div className="text-xs text-slate-500">{targetLabel(finding)}</div>
                      </td>
                      <td className="py-3 pr-3">
                        <VerdictBadge verdict={finding.verdict} label={finding.label} />
                        <div className="mt-1 text-xs text-slate-400">
                          {finding.freshness === "fresh"
                            ? "자료 최신"
                            : finding.freshness === "stale"
                              ? "자료 오래됨"
                              : "수집시각 미상"}
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-slate-700">{finding.reason}</td>
                      <td className="py-3 pr-3 text-xs text-slate-600">
                        {finding.matchedRuleIds.length > 0 ? finding.matchedRuleIds.join(", ") : "-"}
                        <div className="mt-1 text-slate-400">
                          {finding.evidenceComplete ? "목록 완전성 확인" : "목록 완전성 미확인"}
                        </div>
                      </td>
                      <td className="py-3">
                        <ul className="list-disc space-y-1 pl-4 text-xs text-slate-600">
                          {finding.actions.map((action) => (
                            <li key={action}>{action}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
