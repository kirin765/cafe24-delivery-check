export type TriState = "yes" | "no" | "unknown";

export type Verdict =
  | "configured"
  | "missing"
  | "disabled"
  | "ambiguous"
  | "unknown"
  | "not_applicable";

export type RuleScope = "product" | "variant";

export type RuleStatus = "active" | "inactive" | "unknown";

export interface CatalogEntry {
  mallId: string;
  shopNo: string;
  productNo: string;
  variantCode?: string;
  productName: string;
  digitalConfirmed: TriState;
  saleActive: TriState;
}

export interface DeliveryRule {
  mallId: string;
  shopNo: string;
  productNo: string;
  variantCode?: string;
  ruleId: string;
  scope: RuleScope;
  status: RuleStatus;
  channel?: string;
  configuredAt?: string;
  collectedAt?: string;
  source?: string;
}

export interface MallEvidence {
  mallId: string;
  complete: boolean;
  productRuleCoversVariants?: TriState;
  snapshotFrom?: string;
  snapshotTo?: string;
  collectedAt?: string;
  confirmedBy?: string;
  source?: string;
}

export interface Finding {
  key: string;
  mallId: string;
  shopNo: string;
  productNo: string;
  variantCode?: string;
  productName: string;
  verdict: Verdict;
  label: string;
  reason: string;
  actions: string[];
  matchedRuleIds: string[];
  evidenceComplete: boolean;
  freshness: "fresh" | "stale" | "unknown";
}

export interface EvaluateOptions {
  now?: Date;
  maxEvidenceAgeDays?: number;
}

export type ComparisonChange =
  | "unchanged"
  | "resolved"
  | "regressed"
  | "changed"
  | "new"
  | "gone";

export interface ResolutionNote {
  findingKey: string;
  note: string;
  markedDoneAt: string;
}

export interface ComparisonRow {
  key: string;
  mallId: string;
  shopNo: string;
  productNo: string;
  variantCode?: string;
  productName: string;
  previous?: Verdict;
  current?: Verdict;
  change: ComparisonChange;
  manuallyChecked: boolean;
  verifiedByNewSnapshot: boolean;
  note?: string;
}

export interface CheckRun {
  id: string;
  label: string;
  createdAt: string;
  catalogSource: string;
  rulesSource: string;
  evidence: MallEvidence[];
  catalog: CatalogEntry[];
  rules: DeliveryRule[];
  findings: Finding[];
  previousRunId?: string;
}
