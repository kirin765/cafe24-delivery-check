import { createHmac, timingSafeEqual } from "node:crypto";

export interface LaunchParams {
  mallId: string;
  shopNo: string;
  userId: string | null;
  timestamp: string | null;
}

export type LaunchResult =
  | { ok: true; params: LaunchParams }
  | {
      ok: false;
      reason: "not_configured" | "missing_hmac" | "mismatch" | "stale" | "missing_mall";
      message: string;
    };

const DEFAULT_MAX_AGE_SECONDS = 1800;

function queryWithoutHmac(rawQuery: string): string | null {
  const query = rawQuery.startsWith("?") ? rawQuery.slice(1) : rawQuery;
  const index = query.lastIndexOf("&hmac=");
  if (index === -1) {
    if (query.startsWith("hmac=")) return "";
    return null;
  }
  return query.slice(0, index);
}

function safeEqualBase64(expected: string, actual: string): boolean {
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(actual, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function verifyLaunch(
  rawQuery: string,
  params: URLSearchParams,
  options: { maxAgeSeconds?: number } = {},
): LaunchResult {
  const secret = process.env.CAFE24_CLIENT_SECRET?.trim();
  if (!secret) {
    return { ok: false, reason: "not_configured", message: "CAFE24_CLIENT_SECRET이 설정되지 않았습니다." };
  }

  const mallId = params.get("mall_id")?.trim() ?? "";
  if (!mallId) {
    return { ok: false, reason: "missing_mall", message: "mall_id가 없습니다." };
  }
  const shopNo = params.get("shop_no")?.trim() || "1";
  const userId = params.get("user_id")?.trim() || null;
  const timestamp = params.get("timestamp")?.trim() || null;

  const hmac = params.get("hmac");
  if (!hmac) {
    return { ok: false, reason: "missing_hmac", message: "hmac이 없습니다." };
  }

  const message = queryWithoutHmac(rawQuery);
  if (message === null) {
    return { ok: false, reason: "missing_hmac", message: "hmac 형식이 올바르지 않습니다." };
  }

  let actual: string;
  try {
    actual = decodeURIComponent(hmac);
  } catch {
    return { ok: false, reason: "mismatch", message: "hmac을 해석할 수 없습니다." };
  }

  const expected = createHmac("sha256", secret).update(message).digest("base64");
  if (!safeEqualBase64(expected, actual)) {
    return { ok: false, reason: "mismatch", message: "hmac 검증에 실패했습니다." };
  }

  if (timestamp) {
    const configured = Number(process.env.CAFE24_LAUNCH_MAX_AGE_SECONDS);
    const maxAge =
      options.maxAgeSeconds ??
      (Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_AGE_SECONDS);
    const parsed = Number(timestamp);
    if (Number.isFinite(parsed)) {
      const seconds = parsed > 1e12 ? Math.floor(parsed / 1000) : parsed;
      const age = Math.floor(Date.now() / 1000) - seconds;
      if (Math.abs(age) > maxAge) {
        return { ok: false, reason: "stale", message: "launch 요청이 너무 오래되었습니다." };
      }
    }
  }

  return { ok: true, params: { mallId, shopNo, userId, timestamp } };
}
