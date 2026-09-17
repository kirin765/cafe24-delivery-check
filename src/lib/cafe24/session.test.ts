import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createSessionCookie, createStateCookie, readSessionCookie, readStateCookie } from "./session";

beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("state cookie", () => {
  it("서명된 state를 되읽는다", () => {
    const cookie = createStateCookie({ state: "s1", mallId: "m", shopNo: "1" });
    expect(readStateCookie(cookie)).toMatchObject({ state: "s1", mallId: "m", shopNo: "1" });
  });

  it("값이 없으면 null", () => {
    expect(readStateCookie(undefined)).toBeNull();
  });
});

describe("session cookie", () => {
  const session = {
    mallId: "m",
    shopNo: "1",
    accessToken: "access",
    refreshToken: "refresh",
    accessExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    refreshExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    scopes: ["mall.read_product"],
  };

  it("암호화된 세션을 되읽는다", () => {
    const cookie = createSessionCookie(session);
    expect(readSessionCookie(cookie)).toMatchObject({ mallId: "m", accessToken: "access" });
  });

  it("변조된 세션은 null", () => {
    const cookie = createSessionCookie(session);
    expect(readSessionCookie(`v9${cookie.slice(2)}`)).toBeNull();
  });
});
