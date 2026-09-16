import type { ImportIssue } from "@/features/imports/types";

const FILE_LABELS: Record<string, string> = {
  catalog: "상품 목록",
  rules: "발송 규칙",
  evidence: "근거·완전성",
};

export function IssueList({ issues }: { issues: ImportIssue[] }) {
  if (issues.length === 0) {
    return <p className="text-xs text-green-700">가져오기 오류 없음</p>;
  }
  return (
    <ul className="space-y-1 text-xs">
      {issues.map((issue, index) => (
        <li
          key={`${issue.file}-${issue.row ?? 0}-${index}`}
          className={issue.level === "error" ? "text-red-700" : "text-amber-700"}
        >
          [{FILE_LABELS[issue.file] ?? issue.file}
          {issue.row ? ` ${issue.row}행` : ""}] {issue.column ? `${issue.column}: ` : ""}
          {issue.message}
        </li>
      ))}
    </ul>
  );
}
