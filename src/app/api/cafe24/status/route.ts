import { NextResponse, type NextRequest } from "next/server";
import { readSessionCookie, SESSION_COOKIE } from "@/lib/cafe24/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = readSessionCookie(request.cookies.get(SESSION_COOKIE)?.value);
  return NextResponse.json({
    connected: Boolean(session),
    mallId: session?.mallId ?? null,
    shopNo: session?.shopNo ?? null,
  });
}
