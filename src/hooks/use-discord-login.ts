"use client";

import * as React from "react";

import { requestDiscordLogin } from "~/lib/auth-client";

export function useDiscordLogin() {
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const login = React.useCallback(async (returnTo?: string) => {
    try {
      setIsLoggingIn(true);
      setError(null);
      const url = await requestDiscordLogin(returnTo);
      window.location.assign(url);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(message);
      console.error("[Login]", err);
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  return { login, isLoggingIn, error };
}
