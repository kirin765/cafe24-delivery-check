import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verifyLaunch } from "./launch";

const SECRET = "test-secret";
const previous = process.env.CAFE24_CLIENT_SECRET;

beforeAll(() => {
  process.env.CAFE24_CLIENT_SECRET = SECRET;
});
afterAll(() => {
  process.env.CAFE24_CLIENT_SECRET = previous;
});

function signed(query: string): string {
  const hmac = createHmac("sha256", SECRET).update(query).digest("base64");
  return `?${query}&hmac=${encodeURIComponent(hmac)}`;
}

describe("verifyLaunch", () => {
  it("유효한 서명을 통과시킨다", () => {
    const query = "mall_id=onnurimun&shop_no=1&user_id=admin&timestamp=9999999999";
    const raw = signed(query);
    const result = verifyLaunch(raw, new URLSearchParams(raw.slice(1)), {
      maxAgeSeconds: Number.MAX_SAFE_INTEGER,
    });
    expect(result).toMatchObject({ ok: true, params: { mallId: "onnurimun", shopNo: "1" } });
  });

  it("서명이 다르면 거부한다", () => {
    const raw = `?mall_id=onnurimun&hmac=${encodeURIComponent("wrong")}`;
    const result = verifyLaunch(raw, new URLSearchParams(raw.slice(1)));
    expect(result).toMatchObject({ ok: false, reason: "mismatch" });
  });

  it("오래된 timestamp를 거부한다", () => {
    const query = "mall_id=onnurimun&timestamp=1000000000";
    const raw = signed(query);
    const result = verifyLaunch(raw, new URLSearchParams(raw.slice(1)), { maxAgeSeconds: 60 });
    expect(result).toMatchObject({ ok: false, reason: "stale" });
  });

  it("mall_id가 없으면 거부한다", () => {
    const query = "shop_no=1";
    const raw = signed(query);
    const result = verifyLaunch(raw, new URLSearchParams(raw.slice(1)));
    expect(result).toMatchObject({ ok: false, reason: "missing_mall" });
  });
});
