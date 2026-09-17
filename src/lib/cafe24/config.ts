export const DEFAULT_SCOPES = "mall.read_product";
const MALL_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export interface Cafe24Config {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
}

export function isValidMallId(value: string): boolean {
  return MALL_ID_PATTERN.test(value);
}

export function isValidShopNo(value: string): boolean {
  return /^[0-9]{1,10}$/.test(value);
}

export function getCafe24Config(): Cafe24Config {
  const clientId = process.env.CAFE24_CLIENT_ID?.trim();
  const clientSecret = process.env.CAFE24_CLIENT_SECRET?.trim();
  const redirectUri = process.env.CAFE24_REDIRECT_URI?.trim();
  const scopes = (process.env.CAFE24_SCOPES?.trim() || DEFAULT_SCOPES).replace(/\s+/g, " ");

  const missing = [
    ["CAFE24_CLIENT_ID", clientId],
    ["CAFE24_CLIENT_SECRET", clientSecret],
    ["CAFE24_REDIRECT_URI", redirectUri],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`missing environment variables: ${missing.join(", ")}`);
  }

  return {
    clientId: clientId as string,
    clientSecret: clientSecret as string,
    redirectUri: redirectUri as string,
    scopes,
  };
}

export function apiBaseFor(mallId: string): string {
  const override = process.env.CAFE24_API_BASE?.trim();
  if (override) return override.replace(/\/+$/, "");
  return `https://${mallId}.cafe24api.com`;
}

export function tokenUtcOffset(): string {
  return process.env.CAFE24_TOKEN_UTC_OFFSET?.trim() || "+09:00";
}
