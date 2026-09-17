"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FindingsTable } from "@/app/components/FindingsTable";
import { IssueList } from "@/app/components/IssueList";
import { CHANGE_LABELS, compareFindings } from "@/features/checks/compare";
import { buildChecklistCsv, downloadTextFile } from "@/features/checks/checklist";
import { buildEvidenceTemplateCsv, buildRulesTemplateCsv } from "@/features/checks/templates";
import { evaluateReadiness, VERDICT_LABELS } from "@/features/checks/evaluateReadiness";
import {
  getResolutionsSnapshot,
  getRunSnapshot,
  getServerResolutionsSnapshot,
  getServerRunSnapshot,
  newRunId,
  saveResolutions,
  saveRun,
  subscribe,
} from "@/features/checks/store";
import { needsAttention, summarize, VERDICT_ORDER } from "@/features/checks/summary";
import type { CheckRun, ComparisonRow, Finding } from "@/features/checks/types";
import { hasBlockingErrors, parseImportBundle } from "@/features/imports/parse";
import { catalogToCsv, evidenceToCsv, rulesToCsv } from "@/fixtures/demo";

type Filter = "all" | "attention" | "configured";

export default function CheckDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>("all");

  const run = useSyncExternalStore(
    subscribe,
    () => getRunSnapshot(id),
    getServerRunSnapshot,
  );
  const resolutions = useSyncExternalStore(
    subscribe,
    () => getResolutionsSnapshot(id),
    getServerResolutionsSnapshot,
  );

  const [recheckCatalog, setRecheckCatalog] = useState("");
  const [recheckRules, setRecheckRules] = useState("");
  const [recheckEvidence, setRecheckEvidence] = useState("");
  const [recheckFindings, setRecheckFindings] = useState<Finding[] | null>(null);
  const [comparison, setComparison] = useState<ComparisonRow[] | null>(null);

  const parsedRecheck = useMemo(
    () => parseImportBundle({ catalog: recheckCatalog, rules: recheckRules, evidence: recheckEvidence }),
    [recheckCatalog, recheckRules, recheckEvidence],
  );

  if (!run) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          저장된 점검을 불러오지 못했습니다. 이 브라우저에 저장된 점검이 아니거나, 아직 불러오는 중일 수
          있습니다.
        </p>
        <Link href="/checks/new" className="text-sm text-slate-900 underline">
          새 점검 시작
        </Link>
      </div>
    );
  }

  const counts = summarize(run.findings);
  const visible: Finding[] =
    filter === "all"
      ? run.findings
      : filter === "attention"
        ? run.findings.filter((finding) => needsAttention(finding.verdict))
        : run.findings.filter((finding) => finding.verdict === "configured");

  const resolutionByKey = new Map(resolutions.map((note) => [note.findingKey, note]));

  const saveNote = (findingKey: string) => {
    const value = (noteDrafts[findingKey] ?? resolutionByKey.get(findingKey)?.note ?? "").trim();
    const others = resolutions.filter((note) => note.findingKey !== findingKey);
    const next = value
      ? [...others, { findingKey, note: value, markedDoneAt: new Date().toISOString() }]
      : others;
    saveResolutions(run.id, next);
  };

  const fillFromCurrent = () => {
    setRecheckCatalog(catalogToCsv(run.catalog));
    setRecheckRules(rulesToCsv(run.rules));
    setRecheckEvidence(evidenceToCsv(run.evidence));
  };

  const runRecheck = () => {
    if (hasBlockingErrors(parsedRecheck.issues) || parsedRecheck.catalog.length === 0) return;
    const findings = evaluateReadiness(parsedRecheck.catalog, parsedRecheck.rules, parsedRecheck.evidence);
    setRecheckFindings(findings);
    setComparison(compareFindings(run.findings, findings, resolutions));
  };

  const saveAsNewRun = () => {
    if (!recheckFindings) return;
    const next: CheckRun = {
      id: newRunId(),
      label: `${run.label} (재점검)`,
      createdAt: new Date().toISOString(),
      catalogSource: "manual-csv",
      rulesSource: "manual-csv",
      evidence: parsedRecheck.evidence,
      catalog: parsedRecheck.catalog,
      rules: parsedRecheck.rules,
      findings: recheckFindings,
      previousRunId: run.id,
    };
    saveRun(next);
    router.push(`/checks/${next.id}`);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{run.label}</h1>
            <p className="mt-1 text-xs text-slate-500">
              생성 {new Date(run.createdAt).toLocaleString("ko-KR")} · 자료 {run.catalogSource} /{" "}
              {run.rulesSource} · 실제 발송 검증 아님
            </p>
          </div>
          <button
            type="button"
            data-testid="download-checklist"
            onClick={() => downloadTextFile(`delivery-check-${run.id}.csv`, buildChecklistCsv(run, resolutions))}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            체크리스트 CSV 내려받기
          </button>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {VERDICT_ORDER.map((verdict) => (
            <div key={verdict} className="rounded border border-slate-200 p-2">
              <div className="text-xs text-slate-500">{VERDICT_LABELS[verdict]}</div>
              <div className="text-lg font-semibold text-slate-900">{counts[verdict]}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">사용한 근거 자료</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-3">몰</th>
                <th className="py-2 pr-3">완전성</th>
                <th className="py-2 pr-3">상품→옵션 적용</th>
                <th className="py-2 pr-3">snapshot</th>
                <th className="py-2 pr-3">수집시각</th>
                <th className="py-2 pr-3">확인자</th>
                <th className="py-2">출처</th>
              </tr>
            </thead>
            <tbody>
              {run.evidence.map((item) => (
                <tr key={item.mallId} className="border-b border-slate-100 text-slate-700">
                  <td className="py-2 pr-3 font-medium">{item.mallId}</td>
                  <td className="py-2 pr-3">{item.complete ? "완전(확인됨)" : "불완전"}</td>
                  <td className="py-2 pr-3">{item.productRuleCoversVariants ?? "unknown"}</td>
                  <td className="py-2 pr-3">
                    {item.snapshotFrom ?? "?"} ~ {item.snapshotTo ?? "?"}
                  </td>
                  <td className="py-2 pr-3">{item.collectedAt ?? "미상"}</td>
                  <td className="py-2 pr-3">{item.confirmedBy ?? "미상"}</td>
                  <td className="py-2">{item.source ?? "미상"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-900">판정 결과</h2>
          {(
            [
              ["all", "전체"],
              ["attention", "확인 필요"],
              ["configured", "설정 확인"],
            ] as const
          ).map(([value, text]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded border px-2 py-1 text-xs ${
                filter === value
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {text}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <FindingsTable findings={visible} />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">규칙 확인 서식 (수동)</h2>
        <p className="mt-1 text-xs text-slate-500">
          외부 발송 서비스에 규칙 export가 없을 때, 디지털 상품별로 규칙을 확인해 서식을 채웁니다.
          규칙이 실제로 있으면 <code>rule_id</code>를 실제 값으로 바꾸고 <code>active</code>를
          active/inactive로, 규칙이 없으면 그 행을 삭제하세요. 모든 상품을 확인했으면 근거 서식의{" "}
          <code>complete</code>를 yes로 바꿉니다.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="download-rules-template"
            onClick={() => downloadTextFile("rules-template.csv", buildRulesTemplateCsv(run.catalog))}
            className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
          >
            규칙 서식 내려받기
          </button>
          <button
            type="button"
            data-testid="download-evidence-template"
            onClick={() =>
              downloadTextFile("evidence-template.csv", buildEvidenceTemplateCsv(run.evidence))
            }
            className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
          >
            근거 서식 내려받기
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">수동 완료 메모</h2>
        <p className="mt-1 text-xs text-slate-500">
          ‘수정했다고 메모함’은 새 자료로 확인한 것과 다릅니다. 메모는 기록용이며 판정을 바꾸지 않습니다.
        </p>
        <ul className="mt-3 space-y-3">
          {run.findings
            .filter((finding) => needsAttention(finding.verdict))
            .map((finding) => {
              const saved = resolutionByKey.get(finding.key);
              return (
                <li key={finding.key} className="rounded border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-slate-900">{finding.productName}</span>
                    <span className="text-xs text-slate-500">
                      {finding.mallId} · 상품 {finding.productNo}
                      {finding.variantCode ? ` · 옵션 ${finding.variantCode}` : ""}
                    </span>
                    <span className="text-xs text-slate-500">{finding.label}</span>
                  </div>
                  <textarea
                    data-testid="note-input"
                    data-key={finding.key}
                    value={noteDrafts[finding.key] ?? saved?.note ?? ""}
                    onChange={(event) =>
                      setNoteDrafts((previous) => ({ ...previous, [finding.key]: event.target.value }))
                    }
                    rows={2}
                    placeholder="외부 앱에서 직접 수정했다면 메모를 남기세요. 새 자료로 확인하기 전에는 설정 확인으로 바뀌지 않습니다."
                    className="mt-2 w-full rounded border border-slate-300 p-2 text-xs"
                  />
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      data-testid="save-note"
                      data-key={finding.key}
                      onClick={() => saveNote(finding.key)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                    >
                      메모 저장
                    </button>
                    {saved && (
                      <span className="text-xs text-slate-500">
                        {new Date(saved.markedDoneAt).toLocaleString("ko-KR")} 메모됨 · 검증 아님
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
        </ul>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">새 자료로 재점검</h2>
        <p className="mt-1 text-xs text-slate-500">
          수정 후 새 snapshot을 넣어 이전 판정과 비교합니다. 로컬 처리되며 저장은 새 점검으로만 합니다.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="fill-current"
            onClick={fillFromCurrent}
            className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
          >
            현재 자료 채우기
          </button>
          <button
            type="button"
            data-testid="run-recheck"
            onClick={runRecheck}
            disabled={hasBlockingErrors(parsedRecheck.issues) || parsedRecheck.catalog.length === 0}
            className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            비교 실행
          </button>
          {recheckFindings && (
            <button
              type="button"
              data-testid="save-new-run"
              onClick={saveAsNewRun}
              className="rounded border border-slate-900 px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-slate-100"
            >
              새 점검으로 저장
            </button>
          )}
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <textarea
            data-testid="recheck-catalog"
            value={recheckCatalog}
            onChange={(event) => setRecheckCatalog(event.target.value)}
            rows={5}
            spellCheck={false}
            placeholder="새 상품 목록 CSV"
            className="w-full rounded border border-slate-300 p-2 font-mono text-xs"
          />
          <textarea
            data-testid="recheck-rules"
            value={recheckRules}
            onChange={(event) => setRecheckRules(event.target.value)}
            rows={5}
            spellCheck={false}
            placeholder="새 발송 규칙 CSV"
            className="w-full rounded border border-slate-300 p-2 font-mono text-xs"
          />
          <textarea
            data-testid="recheck-evidence"
            value={recheckEvidence}
            onChange={(event) => setRecheckEvidence(event.target.value)}
            rows={5}
            spellCheck={false}
            placeholder="새 근거·완전성 CSV"
            className="w-full rounded border border-slate-300 p-2 font-mono text-xs"
          />
        </div>

        <div className="mt-2">
          <IssueList issues={parsedRecheck.issues} />
        </div>

        {comparison && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="py-2 pr-3">상품</th>
                  <th className="py-2 pr-3">이전</th>
                  <th className="py-2 pr-3">현재</th>
                  <th className="py-2 pr-3">변화</th>
                  <th className="py-2 pr-3">수동 메모</th>
                  <th className="py-2">새 자료로 확인</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr
                    key={row.key}
                    data-testid="comparison-row"
                    data-key={row.key}
                    data-change={row.change}
                    className="border-b border-slate-100 align-top"
                  >
                    <td className="py-2 pr-3">
                      <div className="font-medium text-slate-900">{row.productName}</div>
                      <div className="text-xs text-slate-500">
                        {row.mallId} · 상품 {row.productNo}
                        {row.variantCode ? ` · 옵션 ${row.variantCode}` : ""}
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-xs text-slate-600">
                      {row.previous ? VERDICT_LABELS[row.previous] : "-"}
                    </td>
                    <td className="py-2 pr-3 text-xs text-slate-600">
                      {row.current ? VERDICT_LABELS[row.current] : "-"}
                    </td>
                    <td className="py-2 pr-3 text-xs text-slate-700">{CHANGE_LABELS[row.change]}</td>
                    <td className="py-2 pr-3 text-xs text-slate-600">{row.manuallyChecked ? "있음" : "-"}</td>
                    <td className="py-2 text-xs text-slate-600">
                      {row.verifiedByNewSnapshot ? "예" : "아니오"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
