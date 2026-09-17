import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { looksLikeSpreadsheet, readTabularRows } from "./tabular";

function xlsxBytes(rows: string[][]): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "상품");
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

function textBytes(text: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(text);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

describe("readTabularRows", () => {
  it("xlsx 첫 시트를 행 단위로 읽는다", () => {
    const bytes = xlsxBytes([
      ["상품코드", "상품명", "판매상태"],
      ["P0000101", "샘플 타월", "Y"],
    ]);
    expect(looksLikeSpreadsheet("products.xlsx", bytes)).toBe(true);
    expect(readTabularRows("products.xlsx", bytes)).toEqual([
      ["상품코드", "상품명", "판매상태"],
      ["P0000101", "샘플 타월", "Y"],
    ]);
  });

  it("CSV는 자체 파서로 읽고 따옴표를 처리한다", () => {
    const bytes = textBytes('상품코드,상품명\nP1,"타월, 대형"\n');
    expect(looksLikeSpreadsheet("products.csv", bytes)).toBe(false);
    expect(readTabularRows("products.csv", bytes)).toEqual([
      ["상품코드", "상품명"],
      ["P1", "타월, 대형"],
    ]);
  });

  it("빈 입력은 빈 배열을 돌려준다", () => {
    expect(readTabularRows("empty.csv", textBytes(""))).toEqual([]);
  });
});
