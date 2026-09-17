import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { buildAuthorizeUrl, exchangeCode, refreshTokens } from "./oauth";

beforeAll(() => {
  process.env.CAFE24_CLIENT_ID = "client-id";
  process.env.CAFE24_CLIENT_SECRET = "client-secret";
  process.env.CAFE24_REDIRECT_URI = "https://app.example.com/api/cafe24/oauth/callback";
  process.env.CAFE24_API_BASE = "https://mall.example.com";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildAuthorizeUrl", () => {
  it("client_id·redirect_uri·scope를 붙인다", () => {
    const url = new URL(buildAuthorizeUrl({ mallId: "m", shopNo: "1", state: "s" }));
    expect(url.pathname).toBe("/api/v2/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://app.example.com/api/cafe24/oauth/callback",
    );
    expect(url.searchParams.get("scope")).toBe("mall.read_product");
    expect(url.searchParams.get("state")).toBe("s");
  });
});

describe("exchangeCode", () => {
  it("토큰 응답을 파싱한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            access_token: "at",
            refresh_token: "rt",
            expires_at: "2026-09-17T12:00:00",
            refresh_token_expires_at: "2026-10-17T12:00:00",
            scopes: ["mall.read_product"],
          }),
          { status: 200 },
        ),
      ),
    );
    const result = await exchangeCode({ mallId: "m", code: "c" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tokens.accessToken).toBe("at");
      expect(result.tokens.accessExpiresAt).toBe("2026-09-17T03:00:00.000Z");
    }
  });

  it("invalid_grant는 재인증으로 분류한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }),
      ),
    );
    const result = await exchangeCode({ mallId: "m", code: "c" });
    expect(result).toMatchObject({ ok: false, kind: "reauth_required" });
  });
});

describe("refreshTokens", () => {
  it("새 갱신 토큰이 없으면 기존 값을 유지한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            access_token: "at2",
            expires_at: "2026-09-17T12:00:00",
            refresh_token_expires_at: "2026-10-17T12:00:00",
          }),
          { status: 200 },
        ),
      ),
    );
    const result = await refreshTokens({ mallId: "m", refreshToken: "old-refresh" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tokens.refreshToken).toBe("old-refresh");
  });
});
