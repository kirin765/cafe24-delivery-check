"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IssueList } from "@/app/components/IssueList";
import { ProductExportImport } from "./ProductExportImport";
import { evaluateReadiness, evidenceGaps } from "@/features/checks/evaluateReadiness";
import { newRunId, saveRun } from "@/features/checks/store";
import type { CheckRun } from "@/features/checks/types";
import { toCsv } from "@/features/imports/csv";
import { hasBlockingErrors, parseImportBundle } from "@/features/imports/parse";
import type { ImportFile } from "@/features/imports/types";
import {
  CATALOG_HEADER,
  EVIDENCE_HEADER,
  RULES_HEADER,
  catalogToCsv,
  evidenceToCsv,
  rulesToCsv,
} from "@/fixtures/demo";

const FILE_LABELS: Record<ImportFile, string> = {
  catalog: "상품 목록 CSV",
  rules: "발송 규칙 CSV",
  evidence: "근거·완전성 CSV",
};

export default function NewCheckPage() {
  const router = useRouter();
  const [label, setLabel] = useState("수동 설정 점검");
  const [catalogText, setCatalogText] = useState("");
  const [rulesText, setRulesText] = useState("");
  const [evidenceText, setEvidenceText] = useState("");

  const bundle = useMemo(
    () => parseImportBundle({ catalog: catalogText, rules: rulesText, evidence: evidenceText }),
    [catalogText, rulesText, evidenceText],
  );

  const blocked = hasBlockingErrors(bundle.issues) || bundle.catalog.length === 0;

  const setText = (file: ImportFile, value: string) => {
    if (file === "catalog") setCatalogText(value);
    if (file === "rules") setRulesText(value);
    if (file === "evidence") setEvidenceText(value);
  };

  const loadFile = async (file: ImportFile, selected: File | undefined) => {
    if (!selected) return;
    const text = await selected.text();
    setText(file, text);
  };

  const loadDemo = () => {
    setCatalogText(catalogToCsv());
    setRulesText(rulesToCsv());
    setEvidenceText(evidenceToCsv());
  };

  const downloadTemplate = (file: ImportFile, header: string[], name: string) => {
    const blob = toCsv(header, []);
    const url = URL.createObjectURL(new Blob([blob], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const runCheck = () => {
    if (blocked) return;
    const findings = evaluateReadiness(bundle.catalog, bundle.rules, bundle.evidence);
    const run: CheckRun = {
      id: newRunId(),
      label: label.trim() || "수동 설정 점검",
      createdAt: new Date().toISOString(),
      catalogSource: "manual-csv",
      rulesSource: "manual-csv",
      evidence: bundle.evidence,
      catalog: bundle.catalog,
      rules: bundle.rules,
      findings,
    };
    saveRun(run);
    router.push(`/checks/${run.id}`);
  };

  const textFields: { file: ImportFile; value: string; header: string[]; name: string }[] = [
    { file: "catalog", value: catalogText, header: CATALOG_HEADER, name: "catalog.csv" },
    { file: "rules", value: rulesText, header: RULES_HEADER, name: "rules.csv" },
    { file: "evidence", value: evidenceText, header: EVIDENCE_HEADER, name: "evidence.csv" },
  ];

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-lg font-semibold text-slate-900">새 점검</h1>
        <p className="mt-1 text-sm text-slate-600">
          상품 목록·발송 규칙·근거 CSV를 붙여넣거나 선택하세요. 모든 처리는 브라우저에서만 이루어지며 파일을
          서버로 업로드하지 않습니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="load-demo"
            onClick={loadDemo}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            데모 자료 채우기
          </button>
          <button
            type="button"
            data-testid="run-check"
            onClick={runCheck}
            disabled={blocked}
            className="rounded bg-slate-900 px-4 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            점검 실행
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <label className="block text-sm font-medium text-slate-700">
          점검 이름
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
          />
        </label>
      </section>

      <ProductExportImport onApply={setCatalogText} />

      {textFields.map((field) => (
        <section key={field.file} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-900">{FILE_LABELS[field.file]}</h2>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => loadFile(field.file, event.target.files?.[0])}
              className="text-xs text-slate-600"
            />
            <button
              type="button"
              onClick={() => downloadTemplate(field.file, field.header, field.name)}
              className="text-xs text-slate-500 underline hover:text-slate-800"
            >
              빈 서식 내려받기
            </button>
          </div>
          <textarea
            data-testid={`csv-input-${field.file}`}
            value={field.value}
            onChange={(event) => setText(field.file, event.target.value)}
            rows={6}
            spellCheck={false}
            placeholder={field.header.join(",")}
            className="mt-2 w-full rounded border border-slate-300 p-2 font-mono text-xs"
          />
        </section>
      ))}

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">가져오기 점검</h2>
        <div className="mt-1 text-xs text-slate-500">
          상품 {bundle.catalog.length}행 · 규칙 {bundle.rules.length}행 · 근거 {bundle.evidence.length}행
        </div>
        <div className="mt-2">
          <IssueList issues={bundle.issues} />
        </div>
        {bundle.evidence.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-slate-600">
            {bundle.evidence.map((item) => {
              const gaps = evidenceGaps(item);
              return (
                <li key={item.mallId}>
                  <span className="font-medium">{item.mallId}</span>:{" "}
                  {gaps.length === 0 ? "필수 메타데이터 확인됨" : `누락/미확인 → ${gaps.join(", ")}`}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
