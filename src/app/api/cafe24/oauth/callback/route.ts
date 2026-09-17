import { NextResponse, type NextRequest } from "next/server";
import { safeEqual } from "@/lib/crypto";
import { exchangeCode } from "@/lib/cafe24/oauth";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  STATE_COOKIE,
  cookieOptions,
  createSessionCookie,
  readStateCookie,
} from "@/lib/cafe24/session";

export const dynamic = "force-dynamic";

function fail(request: NextRequest, kind: string, message: string): NextResponse {
  const url = new URL("/checks/new", request.url);
  url.searchParams.set("error", kind);
  url.searchParams.set("message", message.slice(0, 200));
  const response = NextResponse.redirect(url);
  response.cookies.delete(STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const oauthError = params.get("error");

  if (oauthError) {
    return fail(request, "denied", "권한 동의가 취소되었습니다.");
  }

  const stateCookie = readStateCookie(request.cookies.get(STATE_COOKIE)?.value);
  if (!stateCookie || !state || !safeEqual(stateCookie.state, state)) {
    return fail(request, "state", "state 검증에 실패했습니다. 앱을 다시 실행해 주세요.");
  }

  if (!code) {
    return fail(request, "missing_code", "인증 코드가 없습니다.");
  }

  const result = await exchangeCode({ mallId: stateCookie.mallId, code });
  if (!result.ok) {
    return fail(request, result.kind, result.message);
  }

  const response = NextResponse.redirect(new URL("/checks/new?connected=1", request.url));
  response.cookies.set(
    SESSION_COOKIE,
    createSessionCookie({
      mallId: stateCookie.mallId,
      shopNo: stateCookie.shopNo,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      accessExpiresAt: result.tokens.accessExpiresAt,
      refreshExpiresAt: result.tokens.refreshExpiresAt,
      scopes: result.tokens.scopes,
    }),
    cookieOptions(SESSION_MAX_AGE_SECONDS),
  );
  response.cookies.delete(STATE_COOKIE);
  return response;
}
