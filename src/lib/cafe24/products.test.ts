import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Cafe24ApiError, fetchProducts } from "./products";

beforeAll(() => {
  process.env.CAFE24_API_BASE = "https://mall.example.com";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchProducts", () => {
  it("페이지를 넘기며 상품을 모으고 상태를 매핑한다", async () => {
    const page0 = {
      resource: {
        products: [
          { product_no: "1001", product_name: "전자책", selling: "T" },
          { product_no: "1002", product_name: "템플릿", selling: "F" },
        ],
      },
    };
    const page1 = { resource: { products: [{ product_no: "1003", product_name: "강의", selling: "T" }] } };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        const offset = url.searchParams.get("offset");
        const body = offset === "0" ? page0 : page1;
        return new Response(JSON.stringify(body), { status: 200 });
      }),
    );

    const result = await fetchProducts({
      mallId: "m",
      shopNo: "1",
      accessToken: "at",
      limit: 2,
    });

    expect(result.pages).toBe(2);
    expect(result.entries.map((entry) => entry.productNo)).toEqual(["1001", "1002", "1003"]);
    expect(result.entries[0]).toMatchObject({ digitalConfirmed: "unknown", saleActive: "yes" });
    expect(result.entries[1].saleActive).toBe("no");
  });

  it("401은 auth 오류로 분류한다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));
    await expect(
      fetchProducts({ mallId: "m", shopNo: "1", accessToken: "at" }),
    ).rejects.toMatchObject({ kind: "auth" });
  });

  it("필수 필드가 없으면 config 오류로 분류한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ resource: { products: [{ product_no: "1" }] } }), {
          status: 200,
        }),
      ),
    );
    await expect(
      fetchProducts({ mallId: "m", shopNo: "1", accessToken: "at" }),
    ).rejects.toBeInstanceOf(Cafe24ApiError);
  });
});
