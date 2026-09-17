import { describe, expect, it } from "vitest";
import { parseCatalogCsv } from "./parse";
import {
  autoDetectMapping,
  buildCatalogFromExport,
  detectHeaderRow,
  textToTriState,
  type ProductExportMapping,
} from "./productExport";

const CAFE24_HEADER = [
  "상품코드",
  "자체 상품코드",
  "진열상태",
  "판매상태",
  "상품분류 번호",
  "상품명",
  "판매가",
];

function mapping(overrides: Partial<ProductExportMapping> = {}): ProductExportMapping {
  return {
    mallId: "onnurimun",
    shopNo: "1",
    digitalConfirmed: "unknown",
    saleActiveDefault: "unknown",
    columns: {
      productNo: "상품코드",
      productName: "상품명",
      variantCode: "",
      saleActive: "판매상태",
    },
    ...overrides,
  };
}

describe("detectHeaderRow", () => {
  it("제목 행이 있으면 머리글 행을 찾아낸다", () => {
    const rows = [
      ["상품 다운로드", ""],
      ["", ""],
      CAFE24_HEADER,
      ["P0000101", "", "Y", "Y", "29", "샘플 타월", "5000"],
    ];
    expect(detectHeaderRow(rows)).toBe(2);
  });
});

describe("autoDetectMapping", () => {
  it("Cafe24 상품 export 머리글을 인식한다", () => {
    const detected = autoDetectMapping(CAFE24_HEADER);
    expect(detected.columns.productNo).toBe("상품코드");
    expect(detected.columns.productName).toBe("상품명");
    expect(detected.columns.saleActive).toBe("판매상태");
    expect(detected.digitalConfirmed).toBe("unknown");
  });

  it("영문 머리글도 인식한다", () => {
    const detected = autoDetectMapping(["product_code", "product_name", "selling"]);
    expect(detected.columns.productNo).toBe("product_code");
    expect(detected.columns.productName).toBe("product_name");
    expect(detected.columns.saleActive).toBe("selling");
  });
});

describe("buildCatalogFromExport", () => {
  const rows = [
    CAFE24_HEADER,
    ["P0000101", "", "Y", "Y", "29", "샘플 타월", "5000"],
    ["P0000102", "", "Y", "N", "29", "샘플 컵", "3000"],
    ["", "", "Y", "Y", "29", "코드 없음", "1000"],
    ["P0000104", "", "Y", "Y", "29", "", "2000"],
    ["P0000101", "", "Y", "Y", "29", "샘플 타월 중복", "5000"],
  ];

  it("상태 열을 반영하고 상품 번호/이름 없는 행과 중복을 제외한다", () => {
    const result = buildCatalogFromExport(rows, 0, mapping());
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toMatchObject({
      mallId: "onnurimun",
      shopNo: "1",
      productNo: "P0000101",
      productName: "샘플 타월",
      saleActive: "yes",
      digitalConfirmed: "unknown",
    });
    expect(result.entries[1].saleActive).toBe("no");
    expect(result.skipped).toBe(2);
    expect(result.duplicates).toBe(1);
  });

  it("생성한 CSV를 기존 상품 파서로 다시 읽을 수 있다", () => {
    const result = buildCatalogFromExport(rows, 0, mapping());
    const issues: Parameters<typeof parseCatalogCsv>[1] = [];
    const parsed = parseCatalogCsv(result.csv, issues);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].productNo).toBe("P0000101");
    expect(issues.filter((issue) => issue.level === "error")).toHaveLength(0);
  });

  it("mall_id가 없으면 변환하지 않고 이유를 남긴다", () => {
    const result = buildCatalogFromExport(rows, 0, mapping({ mallId: "" }));
    expect(result.entries).toHaveLength(0);
    expect(result.csv).toBe("");
    expect(result.issues.join(" ")).toContain("mall_id");
  });
});

describe("textToTriState", () => {
  it("Y/N과 한글 상태를 해석한다", () => {
    expect(textToTriState("Y")).toBe("yes");
    expect(textToTriState("n")).toBe("no");
    expect(textToTriState("판매중")).toBe("yes");
    expect(textToTriState("판매중지")).toBe("no");
    expect(textToTriState("")).toBe("unknown");
    expect(textToTriState("기타")).toBe("unknown");
  });
});
