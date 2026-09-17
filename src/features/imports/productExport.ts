import type { CatalogEntry, TriState } from "@/features/checks/types";
import { toCsv } from "./csv";
import { CATALOG_HEADER } from "./schema";

export type CatalogFieldKey = "productNo" | "productName" | "variantCode" | "saleActive";

export interface ProductExportMapping {
  mallId: string;
  shopNo: string;
  digitalConfirmed: TriState;
  saleActiveDefault: TriState;
  columns: Record<CatalogFieldKey, string>;
}

export const EXPORT_FIELD_LABELS: Record<CatalogFieldKey, string> = {
  productNo: "상품 번호/코드",
  productName: "상품명",
  variantCode: "옵션 코드 (선택)",
  saleActive: "판매/진열 상태 (선택)",
};

const FIELD_CANDIDATES: Record<CatalogFieldKey, { candidates: string[]; patterns: RegExp[] }> = {
  productNo: {
    candidates: ["상품번호", "상품코드", "자체상품코드", "품번"],
    patterns: [/상품\s*번호/, /상품\s*코드/, /product_?(no|code)/i, /품번/],
  },
  productName: {
    candidates: ["상품명", "품명"],
    patterns: [/상품명/, /품명/, /product_?name/i, /^name$/i],
  },
  variantCode: {
    candidates: ["옵션코드", "품목코드"],
    patterns: [/옵션\s*코드/, /품목\s*코드/, /variant_?code/i, /option_?code/i],
  },
  saleActive: {
    candidates: ["판매상태", "진열상태"],
    patterns: [/판매\s*상태/, /진열\s*상태/, /selling|display|sale_?active/i],
  },
};

const HEADER_HINTS: RegExp[] = [
  /상품/,
  /코드/,
  /명/,
  /판매/,
  /진열/,
  /옵션/,
  /품목/,
  /product/i,
  /name/i,
  /code/i,
  /price/i,
  /status/i,
];

export const EMPTY_MAPPING: ProductExportMapping = {
  mallId: "",
  shopNo: "1",
  digitalConfirmed: "unknown",
  saleActiveDefault: "unknown",
  columns: { productNo: "", productName: "", variantCode: "", saleActive: "" },
};

function normalize(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

function pickColumn(header: string[], field: CatalogFieldKey): string {
  const { candidates, patterns } = FIELD_CANDIDATES[field];
  for (const candidate of candidates) {
    const target = normalize(candidate);
    const found = header.find((name) => normalize(name) === target);
    if (found) return found;
  }
  for (const pattern of patterns) {
    const found = header.find((name) => pattern.test(name));
    if (found) return found;
  }
  return "";
}

export function detectHeaderRow(rows: string[][]): number {
  let bestIndex = 0;
  let bestScore = -1;
  const limit = Math.min(rows.length, 10);
  for (let index = 0; index < limit; index += 1) {
    const score = rows[index].filter(
      (cell) => cell.trim() !== "" && HEADER_HINTS.some((pattern) => pattern.test(cell)),
    ).length;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }
  return bestScore >= 2 ? bestIndex : 0;
}

export function autoDetectMapping(header: string[]): ProductExportMapping {
  return {
    ...EMPTY_MAPPING,
    columns: {
      productNo: pickColumn(header, "productNo"),
      productName: pickColumn(header, "productName"),
      variantCode: pickColumn(header, "variantCode"),
      saleActive: pickColumn(header, "saleActive"),
    },
  };
}

const YES_VALUES = new Set([
  "y",
  "yes",
  "true",
  "1",
  "판매",
  "판매중",
  "진열",
  "진열중",
  "승인",
  "정상",
  "active",
  "on",
]);
const NO_VALUES = new Set([
  "n",
  "no",
  "false",
  "0",
  "판매안함",
  "판매중지",
  "미판매",
  "진열안함",
  "중지",
  "inactive",
  "off",
]);

export function textToTriState(value: string): TriState {
  const normalized = value.trim().toLowerCase();
  if (normalized === "") return "unknown";
  if (YES_VALUES.has(normalized)) return "yes";
  if (NO_VALUES.has(normalized)) return "no";
  return "unknown";
}

export interface BuildCatalogResult {
  csv: string;
  entries: CatalogEntry[];
  skipped: number;
  duplicates: number;
  issues: string[];
}

export function buildCatalogFromExport(
  rows: string[][],
  headerIndex: number,
  mapping: ProductExportMapping,
): BuildCatalogResult {
  const header = rows[headerIndex] ?? [];
  const issues: string[] = [];
  const index = (name: string) => (name ? header.indexOf(name) : -1);

  if (mapping.mallId.trim() === "") issues.push("mall_id(몰 식별자)를 입력하세요.");
  if (mapping.shopNo.trim() === "") issues.push("shop_no를 입력하세요.");
  if (!mapping.columns.productNo) issues.push("상품 번호/코드 열을 선택하세요.");
  if (!mapping.columns.productName) issues.push("상품명 열을 선택하세요.");
  if (issues.length > 0) {
    return { csv: "", entries: [], skipped: 0, duplicates: 0, issues };
  }

  const productNoIndex = index(mapping.columns.productNo);
  const productNameIndex = index(mapping.columns.productName);
  const variantIndex = index(mapping.columns.variantCode);
  const saleIndex = index(mapping.columns.saleActive);
  const cell = (row: string[], column: number) => (column >= 0 ? (row[column] ?? "").trim() : "");

  const entries: CatalogEntry[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  let duplicates = 0;

  for (const row of rows.slice(headerIndex + 1)) {
    const productNo = cell(row, productNoIndex);
    const productName = cell(row, productNameIndex);
    if (productNo === "" || productName === "") {
      skipped += 1;
      continue;
    }
    const variantCode = variantIndex >= 0 ? cell(row, variantIndex) : "";
    const key = [mapping.mallId, mapping.shopNo, productNo, variantCode].join("::");
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);

    const rawSale = saleIndex >= 0 ? cell(row, saleIndex) : "";
    entries.push({
      mallId: mapping.mallId.trim(),
      shopNo: mapping.shopNo.trim(),
      productNo,
      variantCode: variantCode === "" ? undefined : variantCode,
      productName,
      digitalConfirmed: mapping.digitalConfirmed,
      saleActive: rawSale === "" ? mapping.saleActiveDefault : textToTriState(rawSale),
    });
  }

  const csv = toCsv(
    CATALOG_HEADER,
    entries.map((entry) => [
      entry.mallId,
      entry.shopNo,
      entry.productNo,
      entry.variantCode,
      entry.productName,
      entry.digitalConfirmed,
      entry.saleActive,
    ]),
  );

  if (skipped > 0) issues.push(`상품 번호/이름이 없는 ${skipped}행을 건너뛰었습니다.`);
  if (duplicates > 0) issues.push(`중복 상품 행 ${duplicates}개를 제외했습니다.`);

  return { csv, entries, skipped, duplicates, issues };
}
