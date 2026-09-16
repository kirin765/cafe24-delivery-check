import { describe, expect, it } from "vitest";
import { compareFindings } from "./compare";
import type { Finding, Verdict } from "./types";

function finding(key: string, verdict: Verdict): Finding {
  return {
    key,
    mallId: "mall-a",
    shopNo: "1",
    productNo: key,
    productName: `상품 ${key}`,
    verdict,
    label: verdict,
    reason: "",
    actions: [],
    matchedRuleIds: [],
    evidenceComplete: true,
    freshness: "fresh",
  };
}

describe("compareFindings", () => {
  it("누락에서 설정 확인으로 바뀌면 새 자료로 해결됨으로 표시한다", () => {
    const rows = compareFindings([finding("p1", "missing")], [finding("p1", "configured")]);
    expect(rows[0].change).toBe("resolved");
    expect(rows[0].verifiedByNewSnapshot).toBe(true);
  });

  it("설정 확인이 사라지면 회귀로 표시한다", () => {
    const rows = compareFindings([finding("p1", "configured")], [finding("p1", "disabled")]);
    expect(rows[0].change).toBe("regressed");
  });

  it("수동 메모만 있고 새 자료 확인이 없으면 구분해 표시한다", () => {
    const resolutions = [
      { findingKey: "p1", note: "직접 수정함", markedDoneAt: "2026-09-16T00:00:00Z" },
    ];
    const rows = compareFindings([finding("p1", "missing")], [finding("p1", "missing")], resolutions);
    expect(rows[0].change).toBe("unchanged");
    expect(rows[0].manuallyChecked).toBe(true);
    expect(rows[0].verifiedByNewSnapshot).toBe(false);
  });

  it("신규와 제외 항목을 구분한다", () => {
    const rows = compareFindings([finding("p1", "missing")], [finding("p2", "unknown")]);
    expect(rows.map((row) => row.change)).toContain("gone");
    expect(rows.map((row) => row.change)).toContain("new");
  });
});
