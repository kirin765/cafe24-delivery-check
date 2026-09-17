import type { CatalogEntry } from "@/features/checks/types";
import { textToTriState } from "@/features/imports/productExport";
import { apiBaseFor } from "./config";

export class Cafe24ApiError extends Error {
  kind: "auth" | "transient" | "config";
  status?: number;

  constructor(kind: "auth" | "transient" | "config", message: string, status?: number) {
    super(message);
    this.name = "Cafe24ApiError";
    this.kind = kind;
    this.status = status;
  }
}

const PRODUCT_FIELDS = "product_no,product_code,product_name,selling";
const DEFAULT_LIMIT = 100;
const DEFAULT_MAX_PAGES = 20;

type Json = Record<string, unknown>;

function asArray(value: unknown): Json[] {
  return Array.isArray(value) ? (value as Json[]) : [];
}

function pickString(source: Json, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0) return value;
    if (typeof value === "number") return String(value);
  }
  return null;
}

async function callAdminApi(url: URL, accessToken: string): Promise<Json> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new Cafe24ApiError("transient", "Cafe24 상품 API에 연결하지 못했습니다.");
  }

  if (response.status === 401 || response.status === 403) {
    throw new Cafe24ApiError("auth", "Cafe24 상품 조회 권한이 없거나 토큰이 만료되었습니다.", response.status);
  }
  if (!response.ok) {
    throw new Cafe24ApiError("transient", `Cafe24 상품 API 오류 (HTTP ${response.status})`, response.status);
  }

  const text = await response.text();
  try {
    return JSON.parse(text) as Json;
  } catch {
    throw new Cafe24ApiError("transient", "상품 응답을 해석하지 못했습니다.");
  }
}

export interface ProductsResult {
  entries: CatalogEntry[];
  pages: number;
}

export async function fetchProducts(input: {
  mallId: string;
  shopNo: string;
  accessToken: string;
  limit?: number;
  maxPages?: number;
}): Promise<ProductsResult> {
  const limit = input.limit ?? DEFAULT_LIMIT;
  const maxPages = input.maxPages ?? DEFAULT_MAX_PAGES;
  const entries: CatalogEntry[] = [];
  const seen = new Set<string>();
  let pages = 0;

  for (let page = 0; page < maxPages; page += 1) {
    const url = new URL(`${apiBaseFor(input.mallId)}/api/v2/admin/products`);
    url.searchParams.set("shop_no", input.shopNo);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(page * limit));
    url.searchParams.set("fields", PRODUCT_FIELDS);

    const json = await callAdminApi(url, input.accessToken);
    const resource = (json.resource as Json | undefined) ?? json;
    const rows = asArray(resource.products ?? resource);
    pages += 1;
    if (rows.length === 0) break;

    for (const row of rows) {
      const productNo = pickString(row, ["product_no", "product_code"]);
      const productName = pickString(row, ["product_name", "product_name_en"]);
      if (!productNo || !productName) {
        throw new Cafe24ApiError("config", "상품 응답에서 product_no/product_name을 찾지 못했습니다.");
      }
      const key = `${input.mallId}::${input.shopNo}::${productNo}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({
        mallId: input.mallId,
        shopNo: input.shopNo,
        productNo,
        productName,
        digitalConfirmed: "unknown",
        saleActive: textToTriState(pickString(row, ["selling", "display"]) ?? ""),
      });
    }

    if (rows.length < limit) break;
  }

  return { entries, pages };
}
