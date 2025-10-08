"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { Session } from "next-auth";

import {
  SESSION_QUERY_KEY,
  fetchSession,
  type SessionPayload,
} from "~/lib/auth-client";

type AuthSession =
  | ({
      user: NonNullable<Session["user"]>;
      expires: string;
    })
  | null;

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthSessionResult = Omit<UseQueryResult<SessionPayload>, "data" | "status"> & {
  data: AuthSession;
  status: AuthStatus;
  queryStatus: UseQueryResult<SessionPayload>["status"];
};

export function useAuthSession(): AuthSessionResult {
  const query = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchSession,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { status: queryStatus, data: rawData, ...rest } = query;

  const session =
    rawData && rawData.user
      ? {
          user: rawData.user,
          expires: rawData.expires,
        }
      : null;

  const status: AuthStatus = query.isLoading
    ? "loading"
    : session
      ? "authenticated"
      : "unauthenticated";

  return {
    ...rest,
    data: session,
    status,
    queryStatus,
  };
}
