import { decryptSecret, encryptSecret, randomToken, signValue, verifyValue } from "@/lib/crypto";

export const STATE_COOKIE = "cdc_oauth_state";
export const SESSION_COOKIE = "cdc_session";
export const STATE_MAX_AGE_SECONDS = 600;
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface OAuthState {
  state: string;
  mallId: string;
  shopNo: string;
  ts: number;
}

export interface TokenSession {
  mallId: string;
  shopNo: string;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  scopes: string[];
  ts: number;
}

export function newState(): string {
  return randomToken(24);
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function createStateCookie(input: Omit<OAuthState, "ts">): string {
  return signValue({ ...input, ts: Date.now() });
}

export function readStateCookie(token: string | undefined): OAuthState | null {
  return verifyValue<OAuthState>(token, STATE_MAX_AGE_SECONDS);
}

export function createSessionCookie(input: Omit<TokenSession, "ts">): string {
  return encryptSecret(JSON.stringify({ ...input, ts: Date.now() }));
}

export function readSessionCookie(token: string | undefined): TokenSession | null {
  if (!token) return null;
  try {
    const parsed = JSON.parse(decryptSecret(token)) as TokenSession;
    if (typeof parsed.ts === "number" && Date.now() - parsed.ts > SESSION_MAX_AGE_SECONDS * 1000) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
