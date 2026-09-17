import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, randomToken, safeEqual, signValue, verifyValue } from "./crypto";

beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("encryptSecret", () => {
  it("암호화 후 복호화하면 원문이 나온다", () => {
    const payload = JSON.stringify({ accessToken: "abc.def", mallId: "onnurimun" });
    expect(decryptSecret(encryptSecret(payload))).toBe(payload);
  });

  it("변조된 암호문은 복호화에 실패한다", () => {
    const encrypted = encryptSecret("secret");
    const tampered = `${encrypted.slice(0, -2)}xx`;
    expect(() => decryptSecret(tampered)).toThrow();
  });
});

describe("signValue / verifyValue", () => {
  it("서명한 값을 검증한다", () => {
    const token = signValue({ mallId: "m", shopNo: "1" });
    expect(verifyValue<{ mallId: string }>(token, 600)?.mallId).toBe("m");
  });

  it("변조된 값을 거부한다", () => {
    const token = signValue({ mallId: "m" });
    expect(verifyValue(token.replace(/.$/, (c) => (c === "a" ? "b" : "a")), 600)).toBeNull();
  });

  it("만료된 값을 거부한다", () => {
    const token = signValue({ mallId: "m", ts: Date.now() - 700_000 });
    expect(verifyValue(token, 600)).toBeNull();
  });
});

describe("safeEqual / randomToken", () => {
  it("같은 문자열만 true", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });

  it("토큰은 매번 다르다", () => {
    expect(randomToken(16)).not.toBe(randomToken(16));
  });
});
