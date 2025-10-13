import type { Session } from "next-auth";

import { auth } from "~/server/auth";
import { db } from "~/server/db";

const sessionCookieNames = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
] as const;

const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const parseCookies = (header: string): Record<string, string> => {
  const pairs = header.split(";");
  const cookies: Record<string, string> = {};

  for (const pair of pairs) {
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex === -1) continue;

    const name = pair.slice(0, separatorIndex).trim();
    if (!name) continue;

    let rawValue = pair.slice(separatorIndex + 1).trim();
    if (!rawValue) continue;

    if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
      rawValue = rawValue.slice(1, -1);
    }

    cookies[name] = safeDecode(rawValue);
  }

  return cookies;
};

const isValidSessionToken = (token: string) => {
  if (token.length < 16 || token.length > 256) {
    return false;
  }
  return /^[A-Za-z0-9._-]+$/.test(token);
};

export const extractSessionToken = (headers: Headers): string | null => {
  const raw = headers.get("cookie");
  if (!raw) return null;
  try {
    const cookies = parseCookies(raw);
    for (const name of sessionCookieNames) {
      const candidate = cookies[name];
      if (typeof candidate !== "string") continue;
      if (isValidSessionToken(candidate)) {
        return candidate;
      }
      return null;
    }
  } catch {
    return null;
  }
  return null;
};

export type RequestContext = {
  db: typeof db;
  session: Session | null;
  sessionToken: string | null;
  headers: Headers;
};

export const createRequestContext = async ({
  headers,
}: {
  headers: Headers;
}): Promise<RequestContext> => {
  let session: Session | null = null;
  try {
    const getSession = auth as unknown as () => Promise<Session | null>;
    session = await getSession();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[auth] session resolution failed:", err);
    }
  }

  return {
    db,
    session,
    sessionToken: extractSessionToken(headers),
    headers,
  };
};
