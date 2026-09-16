import { describe, expect, it } from "vitest";
import { evaluateReadiness } from "@/features/checks/evaluateReadiness";
import { summarize } from "@/features/checks/summary";
import { demoCatalog, demoEvidence, demoRules } from "./demo";

const DEMO_NOW = new Date("2026-09-16T00:00:00+09:00");

function verdicts(scenario: "complete" | "incomplete" | "stale") {
  return evaluateReadiness(demoCatalog, demoRules, demoEvidence(scenario), { now: DEMO_NOW });
}

describe("demo fixtures", () => {
  it("완전한 자료에서 정상·누락·불명·비활성 사례를 만든다", () => {
    const counts = summarize(verdicts("complete"));
    expect(counts.configured).toBe(2);
    expect(counts.missing).toBe(1);
    expect(counts.disabled).toBe(1);
    expect(counts.ambiguous).toBe(2);
    expect(counts.unknown).toBe(2);
    expect(counts.not_applicable).toBe(1);
  });

  it("불완전 자료에서는 누락이 불명으로 바뀐다", () => {
    const counts = summarize(verdicts("incomplete"));
    expect(counts.missing).toBe(0);
    expect(counts.unknown).toBe(3);
  });

  it("오래된 자료에서는 규칙이 있어도 불명으로 바뀐다", () => {
    const counts = summarize(verdicts("stale"));
    expect(counts.unknown).toBe(7);
    expect(counts.configured).toBe(1);
    expect(counts.missing).toBe(0);
  });

  it("같은 상품 번호 1001이 몰별로 다른 판정을 받는다", () => {
    const findings = verdicts("complete");
    const mallA = findings.find((finding) => finding.mallId === "demo-mall-a" && finding.productNo === "1001");
    const mallB = findings.find((finding) => finding.mallId === "demo-mall-b" && finding.productNo === "1001");
    expect(mallA?.verdict).toBe("configured");
    expect(mallB?.verdict).toBe("unknown");
  });
});
