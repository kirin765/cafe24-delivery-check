import { describe, expect, it } from "vitest";
import { evaluateReadiness } from "./evaluateReadiness";
import type { CatalogEntry, DeliveryRule, MallEvidence } from "./types";

const NOW = new Date("2026-09-16T00:00:00Z");

function entry(overrides: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    mallId: "mall-a",
    shopNo: "1",
    productNo: "1001",
    productName: "전자책",
    digitalConfirmed: "yes",
    saleActive: "yes",
    ...overrides,
  };
}

function rule(overrides: Partial<DeliveryRule> = {}): DeliveryRule {
  return {
    mallId: "mall-a",
    shopNo: "1",
    productNo: "1001",
    ruleId: "R1",
    scope: "product",
    status: "active",
    collectedAt: "2026-09-10",
    ...overrides,
  };
}

function evidence(overrides: Partial<MallEvidence> = {}): MallEvidence {
  return {
    mallId: "mall-a",
    complete: true,
    productRuleCoversVariants: "no",
    snapshotFrom: "2026-09-01",
    snapshotTo: "2026-09-10",
    collectedAt: "2026-09-10",
    confirmedBy: "tester",
    source: "unit-test",
    ...overrides,
  };
}

describe("evaluateReadiness", () => {
  it("같은 상품 번호라도 다른 몰의 규칙과 섞이지 않는다", () => {
    const catalog = [
      entry({ mallId: "mall-a", productNo: "1001" }),
      entry({ mallId: "mall-b", productNo: "1001", productName: "다른 몰 전자책" }),
    ];
    const rules = [rule({ mallId: "mall-a", productNo: "1001" })];
    const findings = evaluateReadiness(
      catalog,
      rules,
      [evidence({ mallId: "mall-a" }), evidence({ mallId: "mall-b" })],
      { now: NOW },
    );
    expect(findings[0].verdict).toBe("configured");
    expect(findings[1].verdict).toBe("missing");
    expect(findings[0].key).not.toBe(findings[1].key);
  });

  it("규칙 목록이 불완전하면 행 미발견을 누락이 아니라 불명으로 처리한다", () => {
    const findings = evaluateReadiness(
      [entry({ productNo: "1002" })],
      [],
      [evidence({ complete: false })],
      { now: NOW },
    );
    expect(findings[0].verdict).toBe("unknown");
    expect(findings[0].reason).toContain("완전하다고 확인되지 않아");
  });

  it("완전한 목록에서 규칙이 없으면 누락으로 판정한다", () => {
    const findings = evaluateReadiness([entry({ productNo: "1002" })], [], [evidence()], { now: NOW });
    expect(findings[0].verdict).toBe("missing");
  });

  it("적용 규칙이 비활성이면 비활성으로 판정한다", () => {
    const findings = evaluateReadiness(
      [entry()],
      [rule({ status: "inactive" })],
      [evidence()],
      { now: NOW },
    );
    expect(findings[0].verdict).toBe("disabled");
  });

  it("상품 규칙이 옵션에 적용된다고 확인된 경우에만 옵션 항목을 설정 확인으로 판정한다", () => {
    const catalog = [entry({ productNo: "1003", variantCode: "V-1Y" })];
    const rules = [rule({ productNo: "1003", scope: "product" })];
    const confirmed = evaluateReadiness(catalog, rules, [evidence({ productRuleCoversVariants: "yes" })], {
      now: NOW,
    });
    const unknown = evaluateReadiness(catalog, rules, [evidence({ productRuleCoversVariants: "unknown" })], {
      now: NOW,
    });
    expect(confirmed[0].verdict).toBe("configured");
    expect(unknown[0].verdict).toBe("ambiguous");
  });

  it("옵션 규칙은 상품 규칙과 충돌하면 중복/충돌로 표시한다", () => {
    const catalog = [entry({ productNo: "1003", variantCode: "V-1Y" })];
    const rules = [
      rule({ ruleId: "R-product", productNo: "1003", scope: "product" }),
      rule({ ruleId: "R-variant", productNo: "1003", scope: "variant", variantCode: "V-1Y" }),
    ];
    const findings = evaluateReadiness(catalog, rules, [evidence({ productRuleCoversVariants: "yes" })], {
      now: NOW,
    });
    expect(findings[0].verdict).toBe("ambiguous");
  });

  it("동일 범위에 활성 규칙이 중복되면 중복/충돌로 표시한다", () => {
    const rules = [rule({ ruleId: "R1" }), rule({ ruleId: "R2" })];
    const findings = evaluateReadiness([entry()], rules, [evidence()], { now: NOW });
    expect(findings[0].verdict).toBe("ambiguous");
  });

  it("수집시각이 기준일보다 오래되면 불명으로 표시한다", () => {
    const findings = evaluateReadiness([entry()], [rule()], [evidence({ collectedAt: "2025-12-01" })], {
      now: NOW,
    });
    expect(findings[0].verdict).toBe("unknown");
    expect(findings[0].freshness).toBe("stale");
  });

  it("수집시각이 없으면 최신 여부를 알 수 없어 불명으로 표시한다", () => {
    const findings = evaluateReadiness([entry()], [rule()], [evidence({ collectedAt: undefined })], {
      now: NOW,
    });
    expect(findings[0].verdict).toBe("unknown");
    expect(findings[0].freshness).toBe("unknown");
  });

  it("설정시각이 없어도 주문 전후를 추정하지 않고 별도 확인을 안내한다", () => {
    const findings = evaluateReadiness(
      [entry()],
      [rule({ configuredAt: undefined })],
      [evidence()],
      { now: NOW },
    );
    expect(findings[0].verdict).toBe("configured");
    expect(findings[0].actions.join(" ")).toContain("설정시각 미상");
  });

  it("비디지털 상품은 점검 대상에서 제외한다", () => {
    const findings = evaluateReadiness(
      [entry({ digitalConfirmed: "no" })],
      [rule()],
      [evidence()],
      { now: NOW },
    );
    expect(findings[0].verdict).toBe("not_applicable");
  });

  it("디지털 여부가 불명이면 불명으로 표시한다", () => {
    const findings = evaluateReadiness(
      [entry({ digitalConfirmed: "unknown" })],
      [rule()],
      [evidence()],
      { now: NOW },
    );
    expect(findings[0].verdict).toBe("unknown");
  });

  it("몰의 근거 자료가 없으면 불명으로 표시한다", () => {
    const findings = evaluateReadiness([entry({ mallId: "mall-z" })], [rule()], [evidence()], {
      now: NOW,
    });
    expect(findings[0].verdict).toBe("unknown");
    expect(findings[0].freshness).toBe("unknown");
  });
});
