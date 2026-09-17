import { apiBaseFor, getCafe24Config, tokenUtcOffset } from "./config";

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  scopes: string[];
}

export type TokenResult =
  | { ok: true; tokens: TokenSet }
  | { ok: false; kind: "reauth_required" | "transient" | "config"; message: string; status?: number };

function parseTimestamp(value: string, offset: string): string {
  const hasZone = /(z|Z)$|[+-]\d{2}:?\d{2}$/.test(value);
  const parsed = new Date(hasZone ? value : `${value}${offset}`);
  if (Number.isNaN(parsed.getTime())) throw new Error(`unparsable timestamp: ${value}`);
  return parsed.toISOString();
}

export function buildAuthorizeUrl(input: { mallId: string; shopNo?: string; state: string; scopes?: string }): string {
  const config = getCafe24Config();
  const url = new URL(`${apiBaseFor(input.mallId)}/api/v2/oauth/authorize`);
  url.searchParams.set("response_type", "code");
  if (input.shopNo) url.searchParams.set("shop_no", input.shopNo);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("state", input.state);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", input.scopes ?? config.scopes);
  return url.toString();
}

interface RawTokenResponse {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_at?: unknown;
  refresh_token_expires_at?: unknown;
  scopes?: unknown;
  error?: unknown;
  error_description?: unknown;
}

function toTokenSet(json: RawTokenResponse): TokenSet {
  const offset = tokenUtcOffset();
  return {
    accessToken: String(json.access_token),
    refreshToken: typeof json.refresh_token === "string" ? json.refresh_token : "",
    accessExpiresAt: parseTimestamp(String(json.expires_at), offset),
    refreshExpiresAt: parseTimestamp(String(json.refresh_token_expires_at), offset),
    scopes: Array.isArray(json.scopes) ? json.scopes.map(String) : [],
  };
}

async function requestToken(
  mallId: string,
  body: URLSearchParams,
  options: { refreshTokenRequired: boolean },
): Promise<TokenResult> {
  let config;
  try {
    config = getCafe24Config();
  } catch (error) {
    return { ok: false, kind: "config", message: error instanceof Error ? error.message : "invalid configuration" };
  }

  const endpoint = `${apiBaseFor(mallId)}/api/v2/oauth/token`;
  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    });
  } catch {
    return { ok: false, kind: "transient", message: "Cafe24 토큰 서버에 연결하지 못했습니다." };
  }

  const text = await response.text();
  let json: RawTokenResponse = {};
  try {
    json = JSON.parse(text) as RawTokenResponse;
  } catch {
    json = {};
  }

  if (!response.ok) {
    const errorCode = typeof json.error === "string" ? json.error : "";
    const message =
      typeof json.error_description === "string" ? json.error_description : errorCode || `HTTP ${response.status}`;
    if (response.status >= 500) return { ok: false, kind: "transient", status: response.status, message };
    if (errorCode === "invalid_grant" || response.status === 401) {
      return { ok: false, kind: "reauth_required", status: response.status, message };
    }
    return { ok: false, kind: "config", status: response.status, message };
  }

  if (!json.access_token || !json.expires_at) {
    return { ok: false, kind: "transient", message: "토큰 응답 형식이 예상과 다릅니다." };
  }

  let tokens: TokenSet;
  try {
    tokens = toTokenSet(json);
  } catch (error) {
    return { ok: false, kind: "transient", message: error instanceof Error ? error.message : "invalid token payload" };
  }

  if (options.refreshTokenRequired && !tokens.refreshToken) {
    return { ok: false, kind: "transient", message: "갱신 토큰이 응답에 없습니다." };
  }

  return { ok: true, tokens };
}

export async function exchangeCode(input: { mallId: string; code: string }): Promise<TokenResult> {
  let redirectUri: string;
  try {
    redirectUri = getCafe24Config().redirectUri;
  } catch (error) {
    return { ok: false, kind: "config", message: error instanceof Error ? error.message : "invalid configuration" };
  }
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: redirectUri,
  });
  return requestToken(input.mallId, body, { refreshTokenRequired: true });
}

export async function refreshTokens(input: { mallId: string; refreshToken: string }): Promise<TokenResult> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
  });
  const result = await requestToken(input.mallId, body, { refreshTokenRequired: false });
  if (result.ok && !result.tokens.refreshToken) {
    result.tokens.refreshToken = input.refreshToken;
  }
  return result;
}
