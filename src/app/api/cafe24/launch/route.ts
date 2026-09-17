import { NextResponse, type NextRequest } from "next/server";
import { isValidMallId, isValidShopNo } from "@/lib/cafe24/config";
import { verifyLaunch } from "@/lib/cafe24/launch";
import { buildAuthorizeUrl } from "@/lib/cafe24/oauth";
import {
  SESSION_COOKIE,
  STATE_COOKIE,
  STATE_MAX_AGE_SECONDS,
  cookieOptions,
  createStateCookie,
  newState,
  readSessionCookie,
} from "@/lib/cafe24/session";

export const dynamic = "force-dynamic";

function html(message: string, status: number): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="ko"><meta charset="utf-8">
<title>Cafe24 연결</title>
<body style="font-family:sans-serif;max-width:520px;margin:60px auto;padding:0 20px;color:#0f172a">
<h1 style="font-size:20px">Cafe24 연결</h1>
<p style="color:#64748b;font-size:14px">${message}</p>
<p style="color:#94a3b8;font-size:13px">Cafe24 관리자 [앱] 메뉴에서 이 앱을 실행해 주세요.</p>
</body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mallId = params.get("mall_id")?.trim() ?? "";
  const shopNo = params.get("shop_no")?.trim() || "1";
  const hasSignature = Boolean(params.get("hmac"));

  const allowUnverified =
    process.env.NODE_ENV !== "production" || process.env.CAFE24_LAUNCH_ALLOW_UNVERIFIED === "1";

  if (hasSignature) {
    const verified = verifyLaunch(request.nextUrl.search, params);
    if (!verified.ok) return html(verified.message, 401);
  } else if (!allowUnverified) {
    return html("Cafe24 실행 파라미터(hmac)가 없습니다. 주소를 직접 입력해 접근할 수 없습니다.", 401);
  }

  if (!isValidMallId(mallId)) {
    return html("mall_id를 확인할 수 없습니다.", 400);
  }
  if (!isValidShopNo(shopNo)) {
    return html("shop_no가 올바르지 않습니다.", 400);
  }

  const session = readSessionCookie(request.cookies.get(SESSION_COOKIE)?.value);
  if (session && session.mallId === mallId && session.shopNo === shopNo) {
    return NextResponse.redirect(new URL("/checks/new?connected=1", request.url));
  }

  try {
    const state = newState();
    const response = NextResponse.redirect(buildAuthorizeUrl({ mallId, shopNo, state }));
    response.cookies.set(
      STATE_COOKIE,
      createStateCookie({ state, mallId, shopNo }),
      cookieOptions(STATE_MAX_AGE_SECONDS),
    );
    return response;
  } catch (error) {
    return html(error instanceof Error ? error.message : "Cafe24 설정 오류", 503);
  }
}
