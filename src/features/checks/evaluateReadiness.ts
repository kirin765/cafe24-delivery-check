import type {
  CatalogEntry,
  DeliveryRule,
  EvaluateOptions,
  Finding,
  MallEvidence,
  TriState,
  Verdict,
} from "./types";

const DEFAULT_MAX_AGE_DAYS = 90;

export const VERDICT_LABELS: Record<Verdict, string> = {
  configured: "설정 확인",
  missing: "발송 규칙 없음",
  disabled: "설정 비활성",
  ambiguous: "중복/충돌 가능성",
  unknown: "판정 불가",
  not_applicable: "점검 대상 제외",
};

export function makeFindingKey(entry: CatalogEntry): string {
  return [entry.mallId, entry.shopNo, entry.productNo, entry.variantCode ?? ""].join("::");
}

function coveredTriState(value: TriState | undefined): boolean | undefined {
  if (value === "yes") return true;
  if (value === "no") return false;
  return undefined;
}

function ageInDays(iso: string, now: Date): number | null {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return null;
  return (now.getTime() - parsed) / 86_400_000;
}

type RuleApplicability = "confirmed" | "candidate" | "none";

function matchRule(
  entry: CatalogEntry,
  rule: DeliveryRule,
  coversVariants: boolean | undefined,
): RuleApplicability {
  if (rule.mallId !== entry.mallId) return "none";
  if (rule.shopNo !== entry.shopNo) return "none";
  if (rule.productNo !== entry.productNo) return "none";

  if (rule.scope === "variant") {
    if (!entry.variantCode) return "none";
    return rule.variantCode === entry.variantCode ? "confirmed" : "none";
  }

  if (!entry.variantCode) return "confirmed";
  if (coversVariants === true) return "confirmed";
  if (coversVariants === false) return "none";
  return "candidate";
}

export function evidenceGaps(evidence: MallEvidence | undefined): string[] {
  if (!evidence) return ["규칙 자료"];
  const gaps: string[] = [];
  if (!evidence.complete) gaps.push("규칙 목록 완전성 확인");
  if (!evidence.collectedAt) gaps.push("자료 수집시각");
  if (!evidence.source) gaps.push("출처");
  if (!evidence.confirmedBy) gaps.push("확인자");
  if (!evidence.snapshotFrom && !evidence.snapshotTo) gaps.push("snapshot 기간");
  return gaps;
}

function evaluateEntry(
  entry: CatalogEntry,
  rules: DeliveryRule[],
  evidence: MallEvidence[],
  now: Date,
  maxAgeDays: number,
): Finding {
  const base = {
    key: makeFindingKey(entry),
    mallId: entry.mallId,
    shopNo: entry.shopNo,
    productNo: entry.productNo,
    variantCode: entry.variantCode,
    productName: entry.productName,
    matchedRuleIds: [] as string[],
    evidenceComplete: false,
  };

  const mallEvidence = evidence.find((item) => item.mallId === entry.mallId);
  const gaps = evidenceGaps(mallEvidence);

  const finalize = (
    verdict: Verdict,
    reason: string,
    actions: string[],
    extras: Partial<Finding> = {},
  ): Finding => ({
    ...base,
    verdict,
    label: VERDICT_LABELS[verdict],
    reason,
    actions,
    freshness: "fresh",
    ...extras,
  });

  if (entry.digitalConfirmed === "no") {
    return finalize("not_applicable", "운영자가 디지털 전달 대상이 아니라고 확인했습니다.", []);
  }

  if (entry.digitalConfirmed === "unknown") {
    return finalize("unknown", "디지털 상품 여부가 확인되지 않았습니다.", [
      "운영자가 이 상품의 디지털 전달 여부를 확인하세요.",
    ]);
  }

  if (!mallEvidence) {
    return finalize(
      "unknown",
      `몰 ${entry.mallId}의 규칙 자료가 없어 판정할 수 없습니다.`,
      ["해당 몰의 규칙 목록과 완전성 정보를 준비하세요."],
      { freshness: "unknown" },
    );
  }

  const complete = mallEvidence.complete === true;
  const age = mallEvidence.collectedAt ? ageInDays(mallEvidence.collectedAt, now) : null;
  const freshness: Finding["freshness"] =
    age === null ? "unknown" : age > maxAgeDays ? "stale" : "fresh";

  const coversVariants = coveredTriState(mallEvidence.productRuleCoversVariants);
  const matches = rules
    .map((rule) => ({ rule, applies: matchRule(entry, rule, coversVariants) }))
    .filter((match) => match.applies !== "none");

  const matchedRuleIds = matches.map((match) => match.rule.ruleId);
  const activeConfirmed = matches.filter(
    (match) => match.applies === "confirmed" && match.rule.status === "active",
  );
  const candidateActive = matches.filter(
    (match) => match.applies === "candidate" && match.rule.status === "active",
  );
  const inactiveConfirmed = matches.filter(
    (match) => match.applies === "confirmed" && match.rule.status === "inactive",
  );
  const unknownConfirmed = matches.filter(
    (match) => match.applies === "confirmed" && match.rule.status === "unknown",
  );

  const shared = { matchedRuleIds, evidenceComplete: complete, freshness };

  if (freshness === "stale") {
    return finalize(
      "unknown",
      `자료 수집시각(${mallEvidence.collectedAt})이 ${maxAgeDays}일을 넘어 현재 설정 여부를 판정할 수 없습니다.`,
      ["최신 snapshot을 다시 수집해 재점검하세요."],
      shared,
    );
  }

  if (freshness === "unknown") {
    return finalize(
      "unknown",
      "규칙 자료의 수집시각이 없어 최신 여부를 확인할 수 없습니다.",
      ["자료 수집시각을 기록하세요."],
      shared,
    );
  }

  const applicableActive = activeConfirmed.length + candidateActive.length;

  if (applicableActive >= 2) {
    return finalize(
      "ambiguous",
      `동일 범위에 적용될 수 있는 활성 규칙이 ${applicableActive}개 있어 우선순위를 해석할 수 없습니다: ${matchedRuleIds.join(", ")}`,
      ["외부 앱에서 규칙 우선순위와 중복 여부를 확인하세요."],
      shared,
    );
  }

  if (activeConfirmed.length === 1 && candidateActive.length === 0) {
    const rule = activeConfirmed[0].rule;
    const actions: string[] = [];
    if (!complete) actions.push("규칙 목록이 완전하지 않아 다른 규칙이 더 있을 수 있습니다.");
    if (!rule.configuredAt) {
      actions.push("설정시각 미상 — 설정 전 주문이 자동 발송 대상인지 별도로 확인하세요.");
    } else {
      actions.push("설정 전 주문은 별도로 확인하세요. 사후 설정이 과거 주문을 자동 발송한다고 가정하지 않습니다.");
    }
    actions.push("제공 자료상 설정 확인이며 실제 발송 검증이 아닙니다.");
    return finalize(
      "configured",
      `규칙 ${rule.ruleId}(${rule.scope === "variant" ? "옵션" : "상품"} 범위, 채널 ${rule.channel ?? "미상"})이 활성입니다.`,
      actions,
      shared,
    );
  }

  if (candidateActive.length === 1 && activeConfirmed.length === 0) {
    return finalize(
      "ambiguous",
      `상품 전체 규칙 ${candidateActive[0].rule.ruleId}가 이 옵션에 적용되는지 확인되지 않았습니다.`,
      ["외부 앱에서 상품 규칙이 옵션에 적용되는지 의미를 확인하세요."],
      shared,
    );
  }

  if (inactiveConfirmed.length >= 1) {
    return finalize(
      "disabled",
      `적용되는 규칙 ${inactiveConfirmed.map((match) => match.rule.ruleId).join(", ")}이(가) 있으나 모두 비활성입니다.`,
      ["외부 앱에서 규칙을 활성화하거나 새 규칙을 설정하세요."],
      shared,
    );
  }

  if (unknownConfirmed.length >= 1) {
    return finalize(
      "ambiguous",
      `규칙 ${unknownConfirmed.map((match) => match.rule.ruleId).join(", ")}의 활성 여부를 확인할 수 없습니다.`,
      ["외부 앱에서 규칙의 활성 상태를 확인하세요."],
      shared,
    );
  }

  if (!complete) {
    return finalize(
      "unknown",
      `규칙 목록이 완전하다고 확인되지 않아 누락 여부를 판정할 수 없습니다. 필요한 정보: ${gaps.join(", ")}`,
      ["목록 완전성·수집시각·출처·확인자를 갖춘 snapshot을 준비하세요."],
      shared,
    );
  }

  return finalize(
    "missing",
    "이 범위에 적용되는 발송 규칙이 없습니다.",
    ["외부 앱에서 이 상품/옵션의 발송 규칙을 확인하고 설정하세요."],
    shared,
  );
}

export function evaluateReadiness(
  catalog: CatalogEntry[],
  rules: DeliveryRule[],
  evidence: MallEvidence[],
  options: EvaluateOptions = {},
): Finding[] {
  const now = options.now ?? new Date();
  const maxAgeDays = options.maxEvidenceAgeDays ?? DEFAULT_MAX_AGE_DAYS;
  return catalog.map((entry) => evaluateEntry(entry, rules, evidence, now, maxAgeDays));
}
