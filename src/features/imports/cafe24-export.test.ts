import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { autoDetectMapping, buildCatalogFromExport, detectHeaderRow } from "./productExport";
import { readTabularRows } from "./tabular";

function fixtureBytes(): ArrayBuffer {
  const buffer = readFileSync(new URL("./__fixtures__/cafe24-product-export.csv", import.meta.url));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

describe("Cafe24 상품 다운로드 파일", () => {
  it("실제 머리글과 BOM을 읽고 열을 자동 매핑한다", () => {
    const rows = readTabularRows("cafe24-product-export.csv", fixtureBytes());
    expect(rows).toHaveLength(4);
    expect(rows[0][0]).toBe("상품코드");

    const headerIndex = detectHeaderRow(rows);
    expect(headerIndex).toBe(0);
    const detected = autoDetectMapping(rows[headerIndex]);
    expect(detected.columns).toMatchObject({
      productNo: "상품코드",
      productName: "상품명",
      saleActive: "판매상태",
    });
  });

  it("상품 상태를 반영해 상품 목록 CSV로 변환한다", () => {
    const rows = readTabularRows("cafe24-product-export.csv", fixtureBytes());
    const detected = autoDetectMapping(rows[0]);
    const result = buildCatalogFromExport(rows, 0, {
      ...detected,
      mallId: "onnurimun",
      shopNo: "1",
      digitalConfirmed: "unknown",
    });
    expect(result.entries.map((entry) => entry.productNo)).toEqual([
      "P000000P",
      "P000000I",
      "P000000J",
    ]);
    expect(result.entries[0].saleActive).toBe("yes");
    expect(result.entries[2].saleActive).toBe("no");
    expect(result.skipped).toBe(0);
    expect(result.duplicates).toBe(0);
    expect(result.issues).toEqual([]);
  });
});
