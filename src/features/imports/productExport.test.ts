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
    digitalColumn: "",
    digitalValues: "",
    digitalMatchValue: "yes",
    digitalFallbackValue: "no",
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

describe("스마트스토어 상품 export", () => {
  const header = [
    "그룹상품번호",
    "상품번호(스마트스토어)",
    "판매자상품코드",
    "상품명",
    "판매상태",
    "전시상태",
  ];
  const rows = [
    header,
    ["", "13452097975", "", "무자본으로 시작하는 배달 부업", "판매중", "전시중"],
    ["", "13447575227", "", "스마트스토어 부업 시작 가이드", "판매중", "전시중"],
  ];

  it("값이 빈 그룹상품번호 대신 실제 상품번호 열을 고른다", () => {
    const detected = autoDetectMapping(header, rows.slice(1));
    expect(detected.columns.productNo).toBe("상품번호(스마트스토어)");
    expect(detected.columns.productName).toBe("상품명");
    expect(detected.columns.saleActive).toBe("판매상태");
  });

  it("상품 목록 CSV로 변환한다", () => {
    const detected = autoDetectMapping(header, rows.slice(1));
    const result = buildCatalogFromExport(rows, 0, {
      ...detected,
      mallId: "smartstore",
      shopNo: "1",
      digitalConfirmed: "unknown",
    });
    expect(result.entries.map((entry) => entry.productNo)).toEqual([
      "13452097975",
      "13447575227",
    ]);
    expect(result.entries[0].saleActive).toBe("yes");
    expect(result.skipped).toBe(0);
  });
});

describe("디지털 판정 열", () => {
  const rows = [
    ["상품코드", "상품명", "판매상태", "세분류"],
    ["D1", "전자책 A", "판매중", "eBook"],
    ["P1", "강아지 빗", "판매중", "브러시/빗"],
  ];

  it("지정한 열과 값으로 행마다 digital_confirmed를 나눈다", () => {
    const result = buildCatalogFromExport(rows, 0, mapping({
      digitalColumn: "세분류",
      digitalValues: "eBook, 전자책",
      digitalMatchValue: "yes",
      digitalFallbackValue: "no",
    }));
    expect(result.entries[0].digitalConfirmed).toBe("yes");
    expect(result.entries[1].digitalConfirmed).toBe("no");
  });

  it("판정 열이 없으면 고정값을 쓴다", () => {
    const result = buildCatalogFromExport(rows, 0, mapping({ digitalConfirmed: "yes" }));
    expect(result.entries.every((entry) => entry.digitalConfirmed === "yes")).toBe(true);
  });
});

describe("다른 플랫폼 양식", () => {
  it("Shopify 헤더(Handle/Title/Variant SKU/Status)를 인식한다", () => {
    const header = ["Handle", "Title", "Body (HTML)", "Vendor", "Status", "Variant SKU"];
    const rows = [
      header,
      ["black-sunglasses", "Black Sunglasses", "", "Acme", "active", "BS-001"],
    ];
    const detected = autoDetectMapping(header, rows.slice(1));
    expect(detected.columns).toMatchObject({
      productNo: "Handle",
      productName: "Title",
      saleActive: "Status",
      variantCode: "Variant SKU",
    });
    const result = buildCatalogFromExport(rows, 0, {
      ...detected,
      mallId: "shopify",
      shopNo: "1",
      digitalConfirmed: "unknown",
    });
    expect(result.entries[0]).toMatchObject({
      productNo: "black-sunglasses",
      productName: "Black Sunglasses",
      variantCode: "BS-001",
      saleActive: "yes",
    });
  });

  it("WooCommerce 헤더(SKU/Name/Published)를 인식한다", () => {
    const header = ["Type", "SKU", "Name", "Published", "Regular price"];
    const rows = [header, ["simple", "SH99786", "Sample Tee", "1", "12000"]];
    const detected = autoDetectMapping(header, rows.slice(1));
    expect(detected.columns).toMatchObject({
      productNo: "SKU",
      productName: "Name",
      saleActive: "Published",
    });
  });

  it("쿠팡 헤더(등록상품ID/노출상품명/옵션ID)를 인식한다", () => {
    const header = ["등록상품ID", "노출상품명", "판매상태", "옵션ID"];
    const rows = [
      header,
      ["90996608327", "무자본 배달 부업", "판매중", "3039378"],
    ];
    const detected = autoDetectMapping(header, rows.slice(1));
    expect(detected.columns).toMatchObject({
      productNo: "등록상품ID",
      productName: "노출상품명",
      saleActive: "판매상태",
      variantCode: "옵션ID",
    });
  });

  it("Qoo10처럼 안내 행 뒤에 머리글이 오면 머리글 행을 찾는다", () => {
    const rows = [
      ["상품정보 등록/수정 양식", "2~4행은 설명입니다", ""],
      ["item_number", "seller_unique_item_id", "item_name", "Status"],
      ["123456789", "SELLER-1", "Sample Item", "active"],
    ];
    expect(detectHeaderRow(rows)).toBe(1);
    const detected = autoDetectMapping(rows[1], rows.slice(2));
    expect(detected.columns).toMatchObject({
      productNo: "item_number",
      productName: "item_name",
      saleActive: "Status",
    });
  });
});

describe("textToTriState", () => {
  it("Y/N과 한글 상태를 해석한다", () => {
    expect(textToTriState("Y")).toBe("yes");
    expect(textToTriState("n")).toBe("no");
    expect(textToTriState("판매중")).toBe("yes");
    expect(textToTriState("판매중지")).toBe("no");
    expect(textToTriState("전시중")).toBe("yes");
    expect(textToTriState("전시중지")).toBe("no");
    expect(textToTriState("active")).toBe("yes");
    expect(textToTriState("published")).toBe("yes");
    expect(textToTriState("draft")).toBe("no");
    expect(textToTriState("archived")).toBe("no");
    expect(textToTriState("-1")).toBe("no");
    expect(textToTriState("")).toBe("unknown");
    expect(textToTriState("기타")).toBe("unknown");
  });
});
