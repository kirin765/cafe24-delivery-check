import type { CatalogEntry, TriState } from "@/features/checks/types";
import { toCsv } from "./csv";
import { CATALOG_HEADER } from "./schema";

export type CatalogFieldKey = "productNo" | "productName" | "variantCode" | "saleActive";

export interface ProductExportMapping {
  mallId: string;
  shopNo: string;
  digitalConfirmed: TriState;
  digitalColumn: string;
  digitalValues: string;
  digitalMatchValue: TriState;
  digitalFallbackValue: TriState;
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
    candidates: [
      "상품번호",
      "상품코드",
      "자체상품코드",
      "품번",
      "등록상품ID",
      "상품ID",
      "SKU",
      "Handle",
      "item_number",
      "sellerProductId",
      "seller_unique_item_id",
    ],
    patterns: [
      /상품\s*번호/,
      /상품\s*코드/,
      /상품\s*id/i,
      /등록\s*상품/,
      /product_?(no|code|id)/i,
      /seller_?(unique_)?item/i,
      /item_?(number|id)/i,
      /^handle$/i,
      /handle/i,
      /^sku$/i,
      /품번/,
    ],
  },
  productName: {
    candidates: ["상품명", "품명", "노출상품명", "Title", "Name", "item_name"],
    patterns: [/상품명/, /품명/, /product_?name/i, /item_?name/i, /^title$/i, /^name$/i],
  },
  variantCode: {
    candidates: ["옵션코드", "품목코드", "옵션ID", "Variant SKU"],
    patterns: [
      /옵션\s*코드/,
      /품목\s*코드/,
      /옵션\s*id/i,
      /option\d*\s*value/i,
      /variant_?sku/i,
    ],
  },
  saleActive: {
    candidates: ["판매상태", "진열상태", "전시상태", "Status", "Published"],
    patterns: [
      /판매\s*상태/,
      /진열\s*상태/,
      /전시\s*상태/,
      /^status$/i,
      /^published$/i,
      /selling|display|sale_?active/i,
    ],
  },
};

const HEADER_HINTS: RegExp[] = [
  /상품/,
  /코드/,
  /명/,
  /판매/,
  /진열/,
  /전시/,
  /옵션/,
  /품목/,
  /product/i,
  /name/i,
  /code/i,
  /price/i,
  /status/i,
  /sku/i,
  /handle/i,
  /item/i,
];

export const EMPTY_MAPPING: ProductExportMapping = {
  mallId: "",
  shopNo: "1",
  digitalConfirmed: "unknown",
  digitalColumn: "",
  digitalValues: "",
  digitalMatchValue: "yes",
  digitalFallbackValue: "no",
  saleActiveDefault: "unknown",
  columns: { productNo: "", productName: "", variantCode: "", saleActive: "" },
};

function normalize(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

function matchingColumns(header: string[], field: CatalogFieldKey): string[] {
  const { candidates, patterns } = FIELD_CANDIDATES[field];
  const exact: string[] = [];
  for (const candidate of candidates) {
    const target = normalize(candidate);
    const found = header.find((name) => normalize(name) === target);
    if (found) exact.push(found);
  }
  const fuzzy: string[] = [];
  for (const name of header) {
    if (exact.includes(name)) continue;
    if (patterns.some((pattern) => pattern.test(name))) fuzzy.push(name);
  }
  return [...exact, ...fuzzy];
}

function pickColumn(header: string[], field: CatalogFieldKey, dataRows: string[][] = []): string {
  const matches = matchingColumns(header, field);
  if (matches.length === 0) return "";
  if (dataRows.length === 0) return matches[0];

  let best = matches[0];
  let bestFilled = -1;
  for (const name of matches) {
    const index = header.indexOf(name);
    const filled = dataRows.reduce(
      (count, row) => count + ((row[index] ?? "").trim() !== "" ? 1 : 0),
      0,
    );
    if (filled > bestFilled) {
      bestFilled = filled;
      best = name;
    }
  }
  return best;
}

export function detectHeaderRow(rows: string[][]): number {
  let bestIndex = 0;
  let bestScore = -1;
  const limit = Math.min(rows.length, 10);
  for (let index = 0; index < limit; index += 1) {
    const row = rows[index];
    const dataRows = rows.slice(index + 1);
    let score = row.filter(
      (cell) => cell.trim() !== "" && HEADER_HINTS.some((pattern) => pattern.test(cell)),
    ).length;
    if (pickColumn(row, "productNo", dataRows) !== "") score += 3;
    if (pickColumn(row, "productName", dataRows) !== "") score += 3;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }
  return bestScore >= 2 ? bestIndex : 0;
}

export function autoDetectMapping(header: string[], dataRows: string[][] = []): ProductExportMapping {
  return {
    ...EMPTY_MAPPING,
    columns: {
      productNo: pickColumn(header, "productNo", dataRows),
      productName: pickColumn(header, "productName", dataRows),
      variantCode: pickColumn(header, "variantCode", dataRows),
      saleActive: pickColumn(header, "saleActive", dataRows),
    },
  };
}

const YES_VALUES = new Set([
  "y",
  "t",
  "yes",
  "true",
  "1",
  "판매",
  "판매중",
  "진열",
  "진열중",
  "전시",
  "전시중",
  "승인",
  "정상",
  "공개",
  "게시",
  "active",
  "published",
  "publish",
  "on",
]);
const NO_VALUES = new Set([
  "n",
  "f",
  "no",
  "false",
  "0",
  "-1",
  "2",
  "판매안함",
  "판매중지",
  "판매대기",
  "미판매",
  "진열안함",
  "전시중지",
  "전시안함",
  "미전시",
  "비공개",
  "중지",
  "draft",
  "archived",
  "private",
  "pending",
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
  const digitalIndex = index(mapping.digitalColumn);
  const cell = (row: string[], column: number) => (column >= 0 ? (row[column] ?? "").trim() : "");

  const digitalValues = mapping.digitalValues
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value !== "");
  if (digitalIndex >= 0 && digitalValues.length === 0) {
    issues.push("디지털 판정 값이 비어 있어 digital_confirmed 고정값을 사용합니다.");
  }
  const digitalFor = (row: string[]): TriState => {
    if (digitalIndex < 0 || digitalValues.length === 0) return mapping.digitalConfirmed;
    const value = cell(row, digitalIndex).toLowerCase();
    return digitalValues.includes(value) ? mapping.digitalMatchValue : mapping.digitalFallbackValue;
  };

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
      digitalConfirmed: digitalFor(row),
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
