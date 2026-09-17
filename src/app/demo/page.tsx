"use client";

import { useMemo, useState } from "react";
import { FindingsTable } from "@/app/components/FindingsTable";
import { evaluateReadiness, VERDICT_LABELS } from "@/features/checks/evaluateReadiness";
import { summarize, VERDICT_ORDER } from "@/features/checks/summary";
import { demoCatalog, demoEvidence, demoRules, type DemoScenario } from "@/fixtures/demo";

const DEMO_NOW = new Date("2026-09-16T00:00:00+09:00");

const SCENARIOS: { id: DemoScenario; label: string; description: string }[] = [
  {
    id: "complete",
    label: "완전한 자료",
    description: "몰 A는 규칙 목록이 완전하다고 확인됨, 몰 B는 일부만 제공됨",
  },
  {
    id: "incomplete",
    label: "불완전한 자료",
    description: "몰 A의 완전성 확인이 빠지면 누락 대신 불명으로 표시됨",
  },
  {
    id: "stale",
    label: "오래된 자료",
    description: "몰 A 자료가 기준일보다 90일 넘게 오래되면 판정 불가로 바뀜",
  },
];

export default function DemoPage() {
  const [scenario, setScenario] = useState<DemoScenario>("complete");

  const evidence = useMemo(() => demoEvidence(scenario), [scenario]);
  const findings = useMemo(
    () => evaluateReadiness(demoCatalog, demoRules, evidence, { now: DEMO_NOW }),
    [evidence],
  );
  const counts = summarize(findings);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-lg font-semibold text-slate-900">합성 자료 데모</h1>
        <p className="mt-1 text-sm text-slate-600">
          두 몰과 디지털 상품·옵션으로 구성한 합성 snapshot입니다. 기준일 {DEMO_NOW.toISOString().slice(0, 10)}.
          같은 상품 번호(1001)가 서로 다른 몰에 있어도 규칙이 섞이지 않습니다.
        </p>
      </section>

      <section className="flex flex-wrap gap-2">
        {SCENARIOS.map((item) => (
          <button
            key={item.id}
            type="button"
            data-testid={`scenario-${item.id}`}
            onClick={() => setScenario(item.id)}
            className={`rounded border px-3 py-2 text-left text-sm ${
              scenario === item.id
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span className="block font-medium">{item.label}</span>
            <span className={`block text-xs ${scenario === item.id ? "text-slate-200" : "text-slate-500"}`}>
              {item.description}
            </span>
          </button>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {VERDICT_ORDER.map((verdict) => (
          <div
            key={verdict}
            data-testid="summary-count"
            data-verdict={verdict}
            className="rounded-lg border border-slate-200 bg-white p-3"
          >
            <div className="text-xs text-slate-500">{VERDICT_LABELS[verdict]}</div>
            <div data-testid="summary-count-value" className="text-xl font-semibold text-slate-900">
              {counts[verdict]}
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">사용한 근거 자료</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-3">몰</th>
                <th className="py-2 pr-3">목록 완전성</th>
                <th className="py-2 pr-3">상품 규칙 → 옵션 적용</th>
                <th className="py-2 pr-3">snapshot 기간</th>
                <th className="py-2 pr-3">수집시각</th>
                <th className="py-2">출처</th>
              </tr>
            </thead>
            <tbody>
              {evidence.map((item) => (
                <tr key={item.mallId} className="border-b border-slate-100 text-slate-700">
                  <td className="py-2 pr-3 font-medium">{item.mallId}</td>
                  <td className="py-2 pr-3">{item.complete ? "완전(확인됨)" : "불완전"}</td>
                  <td className="py-2 pr-3">{item.productRuleCoversVariants ?? "unknown"}</td>
                  <td className="py-2 pr-3">
                    {item.snapshotFrom} ~ {item.snapshotTo}
                  </td>
                  <td className="py-2 pr-3">{item.collectedAt}</td>
                  <td className="py-2">{item.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">점검 결과</h2>
        <FindingsTable findings={findings} />
      </section>
    </div>
  );
}
