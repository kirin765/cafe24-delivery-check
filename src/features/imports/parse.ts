import type {
  CatalogEntry,
  DeliveryRule,
  MallEvidence,
  RuleScope,
  RuleStatus,
  TriState,
} from "@/features/checks/types";
import { parseTable, type Table } from "./csv";
import type { ImportBundle, ImportFile, ImportIssue } from "./types";

interface DataRecord {
  row: number;
  values: Record<string, string>;
}

const CATALOG_REQUIRED = [
  "mall_id",
  "shop_no",
  "product_no",
  "product_name",
  "digital_confirmed",
  "sale_active",
];
const CATALOG_KNOWN = [...CATALOG_REQUIRED, "variant_code"];

const RULES_REQUIRED = ["mall_id", "shop_no", "product_no", "rule_id", "scope", "active"];
const RULES_KNOWN = [
  ...RULES_REQUIRED,
  "variant_code",
  "channel",
  "configured_at",
  "collected_at",
  "source",
];

const EVIDENCE_REQUIRED = ["mall_id", "complete"];
const EVIDENCE_KNOWN = [
  ...EVIDENCE_REQUIRED,
  "product_rule_covers_variants",
  "snapshot_from",
  "snapshot_to",
  "collected_at",
  "confirmed_by",
  "source",
];

const TRI_ALIASES: Record<string, TriState> = {
  "": "unknown",
  yes: "yes",
  y: "yes",
  true: "yes",
  "1": "yes",
  no: "no",
  n: "no",
  false: "no",
  "0": "no",
  unknown: "unknown",
};

const BOOLEAN_ALIASES: Record<string, boolean> = {
  yes: true,
  y: true,
  true: true,
  "1": true,
  no: false,
  n: false,
  false: false,
  "0": false,
};

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === "";
}

function requireColumns(table: Table, file: ImportFile, required: string[], issues: ImportIssue[]) {
  for (const column of required) {
    if (!table.header.includes(column)) {
      issues.push({ level: "error", file, column, message: `필수 열 누락: ${column}` });
    }
  }
}

function warnUnknownColumns(table: Table, file: ImportFile, known: string[], issues: ImportIssue[]) {
  for (const column of table.header) {
    if (column !== "" && !known.includes(column)) {
      issues.push({ level: "warning", file, column, message: `알 수 없는 열: ${column}` });
    }
  }
}

function toRecords(table: Table, file: ImportFile, issues: ImportIssue[]): DataRecord[] {
  const seen = new Set<string>();
  for (const column of table.header) {
    if (seen.has(column)) {
      issues.push({ level: "warning", file, column, message: `중복 열 이름: ${column}` });
    }
    seen.add(column);
  }
  return table.rows.map((cells, index) => {
    const values: Record<string, string> = {};
    table.header.forEach((name, col) => {
      values[name] = (cells[col] ?? "").trim();
    });
    return { row: index + 2, values };
  });
}

function dateWarning(
  value: string,
  file: ImportFile,
  row: number,
  column: string,
  issues: ImportIssue[],
) {
  if (!isBlank(value) && Number.isNaN(Date.parse(value))) {
    issues.push({ level: "warning", file, row, column, message: `날짜를 해석할 수 없음: ${value}` });
  }
}

function parseTri(value: string, file: ImportFile, row: number, column: string, issues: ImportIssue[]): TriState | null {
  value = value.toLowerCase();
  if (!(value in TRI_ALIASES)) {
    issues.push({
      level: "error",
      file,
      row,
      column,
      message: `확인 값이 올바르지 않음: ${value} (yes/no/unknown)`,
    });
    return null;
  }
  return TRI_ALIASES[value];
}

function parseBooleanish(
  value: string,
  file: ImportFile,
  row: number,
  column: string,
  issues: ImportIssue[],
): boolean | null {
  value = value.toLowerCase();
  if (!(value in BOOLEAN_ALIASES)) {
    issues.push({
      level: "error",
      file,
      row,
      column,
      message: `참/거짓 값을 해석할 수 없음: ${value}`,
    });
    return null;
  }
  return BOOLEAN_ALIASES[value];
}

function parseScope(value: string): RuleScope | null {
  const normalized = value.toLowerCase();
  if (normalized === "product" || normalized === "상품") return "product";
  if (normalized === "variant" || normalized === "option" || normalized === "옵션") return "variant";
  return null;
}

function parseStatus(value: string): RuleStatus | null {
  const normalized = value.toLowerCase();
  if (normalized === "active" || normalized === "enabled" || normalized === "활성") return "active";
  if (normalized === "inactive" || normalized === "disabled" || normalized === "비활성") return "inactive";
  if (normalized === "unknown" || normalized === "") return "unknown";
  if (normalized in BOOLEAN_ALIASES) return BOOLEAN_ALIASES[normalized] ? "active" : "inactive";
  return null;
}

export function parseCatalogCsv(text: string, issues: ImportIssue[]): CatalogEntry[] {
  const table = parseTable(text);
  requireColumns(table, "catalog", CATALOG_REQUIRED, issues);
  warnUnknownColumns(table, "catalog", CATALOG_KNOWN, issues);
  if (table.header.length === 0) return [];

  const entries: CatalogEntry[] = [];
  const seenKeys = new Set<string>();

  for (const { row, values } of toRecords(table, "catalog", issues)) {
    const missing = CATALOG_REQUIRED.filter((column) => isBlank(values[column]));
    if (missing.length > 0) {
      issues.push({
        level: "error",
        file: "catalog",
        row,
        message: `필수 값 누락: ${missing.join(", ")}`,
      });
      continue;
    }

    const digital = parseTri(values.digital_confirmed, "catalog", row, "digital_confirmed", issues);
    const sale = parseTri(values.sale_active, "catalog", row, "sale_active", issues);
    if (digital === null || sale === null) continue;

    const entry: CatalogEntry = {
      mallId: values.mall_id,
      shopNo: values.shop_no,
      productNo: values.product_no,
      variantCode: isBlank(values.variant_code) ? undefined : values.variant_code,
      productName: values.product_name,
      digitalConfirmed: digital,
      saleActive: sale,
    };
    const key = [entry.mallId, entry.shopNo, entry.productNo, entry.variantCode ?? ""].join("::");
    if (seenKeys.has(key)) {
      issues.push({
        level: "warning",
        file: "catalog",
        row,
        message: `중복 상품 행(무시됨): ${key}`,
      });
      continue;
    }
    seenKeys.add(key);
    entries.push(entry);
  }

  return entries;
}

export function parseRulesCsv(text: string, issues: ImportIssue[]): DeliveryRule[] {
  const table = parseTable(text);
  requireColumns(table, "rules", RULES_REQUIRED, issues);
  warnUnknownColumns(table, "rules", RULES_KNOWN, issues);
  if (table.header.length === 0) return [];

  const rules: DeliveryRule[] = [];
  const seenIds = new Set<string>();

  for (const { row, values } of toRecords(table, "rules", issues)) {
    const missing = RULES_REQUIRED.filter((column) => isBlank(values[column]));
    if (missing.length > 0) {
      issues.push({
        level: "error",
        file: "rules",
        row,
        message: `필수 값 누락: ${missing.join(", ")}`,
      });
      continue;
    }

    const scope = parseScope(values.scope);
    if (!scope) {
      issues.push({
        level: "error",
        file: "rules",
        row,
        column: "scope",
        message: `범위 값을 해석할 수 없음: ${values.scope} (product/variant)`,
      });
      continue;
    }

    const status = parseStatus(values.active);
    if (!status) {
      issues.push({
        level: "error",
        file: "rules",
        row,
        column: "active",
        message: `활성 값을 해석할 수 없음: ${values.active}`,
      });
      continue;
    }

    if (scope === "variant" && isBlank(values.variant_code)) {
      issues.push({
        level: "error",
        file: "rules",
        row,
        column: "variant_code",
        message: "variant 범위 규칙에는 variant_code가 필요합니다.",
      });
      continue;
    }

    if (scope === "product" && !isBlank(values.variant_code)) {
      issues.push({
        level: "warning",
        file: "rules",
        row,
        column: "variant_code",
        message: "product 범위 규칙의 variant_code는 무시됩니다.",
      });
    }

    dateWarning(values.configured_at, "rules", row, "configured_at", issues);
    dateWarning(values.collected_at, "rules", row, "collected_at", issues);

    const idKey = `${values.mall_id}::${values.rule_id}`;
    if (seenIds.has(idKey)) {
      issues.push({
        level: "warning",
        file: "rules",
        row,
        message: `중복 rule_id(무시됨): ${idKey}`,
      });
      continue;
    }
    seenIds.add(idKey);

    rules.push({
      mallId: values.mall_id,
      shopNo: values.shop_no,
      productNo: values.product_no,
      variantCode: isBlank(values.variant_code) ? undefined : values.variant_code,
      ruleId: values.rule_id,
      scope,
      status,
      channel: isBlank(values.channel) ? undefined : values.channel,
      configuredAt: isBlank(values.configured_at) ? undefined : values.configured_at,
      collectedAt: isBlank(values.collected_at) ? undefined : values.collected_at,
      source: isBlank(values.source) ? undefined : values.source,
    });
  }

  return rules;
}

export function parseEvidenceCsv(text: string, issues: ImportIssue[]): MallEvidence[] {
  const table = parseTable(text);
  requireColumns(table, "evidence", EVIDENCE_REQUIRED, issues);
  warnUnknownColumns(table, "evidence", EVIDENCE_KNOWN, issues);
  if (table.header.length === 0) return [];

  const evidence: MallEvidence[] = [];
  const seenMalls = new Set<string>();

  for (const { row, values } of toRecords(table, "evidence", issues)) {
    const missing = EVIDENCE_REQUIRED.filter((column) => isBlank(values[column]));
    if (missing.length > 0) {
      issues.push({
        level: "error",
        file: "evidence",
        row,
        message: `필수 값 누락: ${missing.join(", ")}`,
      });
      continue;
    }

    const complete = parseBooleanish(values.complete, "evidence", row, "complete", issues);
    if (complete === null) continue;

    let covers: TriState | undefined;
    if (!isBlank(values.product_rule_covers_variants)) {
      const parsed = parseTri(
        values.product_rule_covers_variants,
        "evidence",
        row,
        "product_rule_covers_variants",
        issues,
      );
      if (parsed === null) continue;
      covers = parsed;
    }

    dateWarning(values.snapshot_from, "evidence", row, "snapshot_from", issues);
    dateWarning(values.snapshot_to, "evidence", row, "snapshot_to", issues);
    dateWarning(values.collected_at, "evidence", row, "collected_at", issues);

    if (seenMalls.has(values.mall_id)) {
      issues.push({
        level: "warning",
        file: "evidence",
        row,
        message: `중복 몰(무시됨): ${values.mall_id}`,
      });
      continue;
    }
    seenMalls.add(values.mall_id);

    evidence.push({
      mallId: values.mall_id,
      complete,
      productRuleCoversVariants: covers ?? "unknown",
      snapshotFrom: isBlank(values.snapshot_from) ? undefined : values.snapshot_from,
      snapshotTo: isBlank(values.snapshot_to) ? undefined : values.snapshot_to,
      collectedAt: isBlank(values.collected_at) ? undefined : values.collected_at,
      confirmedBy: isBlank(values.confirmed_by) ? undefined : values.confirmed_by,
      source: isBlank(values.source) ? undefined : values.source,
    });
  }

  return evidence;
}

export function parseImportBundle(input: {
  catalog: string;
  rules: string;
  evidence: string;
}): ImportBundle {
  const issues: ImportIssue[] = [];
  const catalog = parseCatalogCsv(input.catalog, issues);
  const rules = parseRulesCsv(input.rules, issues);
  const evidence = parseEvidenceCsv(input.evidence, issues);
  return { catalog, rules, evidence, issues };
}

export function hasBlockingErrors(issues: ImportIssue[]): boolean {
  return issues.some((issue) => issue.level === "error");
}
