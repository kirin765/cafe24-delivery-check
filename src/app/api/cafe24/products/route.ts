import { NextResponse, type NextRequest } from "next/server";
import { toCsv } from "@/features/imports/csv";
import { CATALOG_HEADER } from "@/features/imports/schema";
import { refreshTokens } from "@/lib/cafe24/oauth";
import { Cafe24ApiError, fetchProducts } from "@/lib/cafe24/products";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  cookieOptions,
  createSessionCookie,
  readSessionCookie,
} from "@/lib/cafe24/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = readSessionCookie(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "not_connected", connectUrl: "/api/cafe24/launch" }, { status: 401 });
  }

  let refreshCookie: string | null = null;
  let accessToken = session.accessToken;

  if (Date.parse(session.accessExpiresAt) - Date.now() < 60_000) {
    const refreshed = await refreshTokens({ mallId: session.mallId, refreshToken: session.refreshToken });
    if (!refreshed.ok) {
      if (refreshed.kind === "reauth_required") {
        return NextResponse.json({ error: "reauth", connectUrl: "/api/cafe24/launch" }, { status: 401 });
      }
      return NextResponse.json({ error: "transient", message: refreshed.message }, { status: 502 });
    }
    accessToken = refreshed.tokens.accessToken;
    refreshCookie = createSessionCookie({
      ...session,
      accessToken,
      refreshToken: refreshed.tokens.refreshToken,
      accessExpiresAt: refreshed.tokens.accessExpiresAt,
      refreshExpiresAt: refreshed.tokens.refreshExpiresAt,
      scopes: refreshed.tokens.scopes,
    });
  }

  try {
    const { entries } = await fetchProducts({
      mallId: session.mallId,
      shopNo: session.shopNo,
      accessToken,
    });
    const catalogCsv = toCsv(
      CATALOG_HEADER,
      entries.map((entry) => [
        entry.mallId,
        entry.shopNo,
        entry.productNo,
        entry.variantCode,
        entry.productName,
        entry.digitalConfirmed,
        entry.saleActive,
      ]),
    );
    const response = NextResponse.json({
      mallId: session.mallId,
      shopNo: session.shopNo,
      count: entries.length,
      catalogCsv,
    });
    if (refreshCookie) {
      response.cookies.set(SESSION_COOKIE, refreshCookie, cookieOptions(SESSION_MAX_AGE_SECONDS));
    }
    return response;
  } catch (error) {
    if (error instanceof Cafe24ApiError && error.kind === "auth") {
      return NextResponse.json({ error: "reauth", connectUrl: "/api/cafe24/launch" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ error: "transient", message }, { status: 502 });
  }
}
