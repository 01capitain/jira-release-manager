"use client";

import type { Session } from "next-auth";

const LOGIN_ENDPOINT = "/api/auth/login";
const LOGOUT_ENDPOINT = "/api/auth/logout";
const SESSION_ENDPOINT = "/api/auth/session";

export const SESSION_QUERY_KEY = ["auth", "session"] as const;

export type SessionPayload =
  | { user: null }
  | ({
      user: NonNullable<Session["user"]>;
      expires: string;
    });

const isSessionPayload = (value: unknown): value is SessionPayload => {
  if (!value || typeof value !== "object") return false;
  if (!("user" in value)) return false;
  const payload = value as Record<string, unknown>;
  if (payload.user === null) return true;
  if (typeof payload.user === "object" && typeof payload.expires === "string") {
    return true;
  }
  return false;
};

export async function fetchSession(): Promise<SessionPayload> {
  const response = await fetch(SESSION_ENDPOINT, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Session request failed (${response.status})`);
  }

  const data = (await response.json()) as unknown;
  if (!isSessionPayload(data)) {
    throw new Error("Unexpected session payload");
  }

  return data;
}

export async function requestDiscordLogin(returnTo?: string): Promise<string> {
  const response = await fetch(LOGIN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ provider: "discord", returnTo }),
  });

  if (!response.ok) {
    const message = await safeParseError(response);
    throw new Error(message ?? `Login failed (${response.status})`);
  }

  const payload = (await response.json()) as { redirectUrl?: string };
  if (typeof payload.redirectUrl !== "string" || payload.redirectUrl.length === 0) {
    throw new Error("Login response missing redirectUrl");
  }

  return payload.redirectUrl;
}

export async function requestLogout(): Promise<void> {
  const response = await fetch(LOGOUT_ENDPOINT, {
    method: "POST",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const message = await safeParseError(response);
    throw new Error(message ?? `Logout failed (${response.status})`);
  }
}

type ErrorResponse = {
  error?: string;
  message?: string;
};

const safeParseError = async (
  response: Response,
): Promise<string | undefined> => {
  try {
    const data = (await response.json()) as ErrorResponse;
    if (typeof data?.message === "string" && data.message.length > 0) {
      return data.message;
    }
    if (typeof data?.error === "string" && data.error.length > 0) {
      return data.error;
    }
    return undefined;
  } catch {
    return undefined;
  }
};
