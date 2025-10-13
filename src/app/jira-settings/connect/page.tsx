"use client";

import * as React from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { CheckCircle, AlertCircle } from "lucide-react";
import { useAuthSession } from "~/hooks/use-auth-session";
import { useDiscordLogin } from "~/hooks/use-discord-login";
import {
  jiraStatusQueryKey,
  useJiraConfigQuery,
  useJiraCredentialsQuery,
  useSaveJiraCredentialsMutation,
  useVerifyJiraConnectionMutation,
} from "~/app/jira-settings/api";
import { useQueryClient } from "@tanstack/react-query";

export default function JiraConnectPage() {
  const { data: session } = useAuthSession();
  const { login, isLoggingIn, error: loginError } = useDiscordLogin();
  const queryClient = useQueryClient();
  const cfg = useJiraConfigQuery();
  const cred = useJiraCredentialsQuery({ enabled: !!session });
  const save = useSaveJiraCredentialsMutation();
  const verify = useVerifyJiraConnectionMutation();

  const [email, setEmail] = React.useState("");
  const [token, setToken] = React.useState("");
  type StatusMsg = { kind: "success" | "error" | "info"; text: string } | null;
  const [status, setStatus] = React.useState<StatusMsg>(null);
  const [verifyStatus, setVerifyStatus] = React.useState<StatusMsg>(null);
  const [verifyPrimary, setVerifyPrimary] = React.useState(false);

  React.useEffect(() => {
    if (cred.data?.email && !email) setEmail(cred.data.email);
  }, [cred.data?.email, email]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "info", text: "Saving credentials…" });
    try {
      const trimmedEmail = email.trim();
      const trimmedToken = token.trim();
      const payload: { email: string; apiToken?: string } = {
        email: trimmedEmail,
      };
      if (trimmedToken.length > 0) payload.apiToken = trimmedToken;
      await save.mutateAsync(payload);
      if (session) {
        await Promise.all([
          cred.refetch(),
          queryClient.invalidateQueries({ queryKey: jiraStatusQueryKey }),
        ]);
      }
      setStatus({
        kind: "success",
        text: "Saved. Token stored securely and not shown.",
      });
      // Emphasize Verify after successful save
      setVerifyPrimary(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setStatus({ kind: "error", text: msg });
    }
  }

  async function onVerify() {
    setVerifyStatus({ kind: "info", text: "Verifying connection…" });
    try {
      const trimmedEmail = email.trim();
      const trimmedToken = token.trim();
      const res = await verify.mutateAsync({
        email: trimmedEmail,
        apiToken: trimmedToken.length > 0 ? trimmedToken : undefined,
      });
      if (res.ok) {
        const who = res.displayName ?? res.accountId ?? "credentials";
        setVerifyStatus({
          kind: "success",
          text: `Connection verified (${who}).`,
        });
      } else {
        const reason = res.bodyText ?? res.statusText ?? `HTTP ${res.status}`;
        setVerifyStatus({ kind: "error", text: String(reason).slice(0, 800) });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      setVerifyStatus({ kind: "error", text: msg });
    }
    // After a connection try, de-emphasize Verify back to secondary
    setVerifyPrimary(false);
    await queryClient.invalidateQueries({ queryKey: jiraStatusQueryKey });
  }

  // Auto-dismiss success messages after a short timeout
  React.useEffect(() => {
    if (status?.kind === "success") {
      const t = setTimeout(() => setStatus(null), 4000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [status?.kind]);

  React.useEffect(() => {
    if (verifyStatus?.kind === "success") {
      const t = setTimeout(() => setVerifyStatus(null), 4000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [verifyStatus?.kind]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Jira Connect</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Configure Jira connection. Base URL and Project Key are environment
        settings; Email and API token are stored per user in the database.
      </p>
      {!session ? (
        <div className="mt-4 rounded-md border border-neutral-300 bg-neutral-50 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-900">
          Please sign in to configure your Jira credentials.
          <div className="mt-2">
            <Button disabled={isLoggingIn} onClick={() => login()}>
              {isLoggingIn ? "Redirecting…" : "Sign in with Discord"}
            </Button>
          </div>
          {loginError ? (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              Failed to sign in with Discord: {loginError}
            </p>
          ) : null}
        </div>
      ) : null}

      <section className="mt-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-lg font-medium">Environment configuration</h2>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          Update JIRA_BASE_URL and JIRA_PROJECT_KEY in your .env. See
          docs/guides/Add an environment variable.md.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              JIRA_BASE_URL
            </div>
            <div className="mt-1 text-sm">
              {cfg.data?.baseUrl ? (
                <code className="break-all">{cfg.data.baseUrl}</code>
              ) : (
                <span className="font-medium text-red-600 dark:text-red-400">
                  NOT SET
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              JIRA_PROJECT_KEY
            </div>
            <div className="mt-1 text-sm">
              {cfg.data?.projectKey ? (
                <code className="break-all">{cfg.data.projectKey}</code>
              ) : (
                <span className="font-medium text-red-600 dark:text-red-400">
                  NOT SET
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-lg font-medium">User credentials</h2>
        <form className="mt-3 grid gap-4" onSubmit={(e) => void onSave(e)}>
          <div>
            <Label htmlFor="email">Atlassian email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <Label htmlFor="token">API token</Label>
            <Input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="new-password"
              placeholder={
                cred.data?.hasToken
                  ? "Token is set; enter to replace"
                  : "Enter API token"
              }
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={save.isPending || !session}
              variant={verifyPrimary ? "secondary" : "default"}
            >
              {save.isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant={verifyPrimary ? "default" : "secondary"}
              onClick={() => void onVerify()}
              disabled={
                !session ||
                verify.isPending ||
                email.trim().length === 0 ||
                (token.trim().length === 0 && !cred.data?.hasToken)
              }
              aria-label="Verify Jira connection"
              title="Verify Jira connection"
            >
              {verify.isPending ? "Verifying…" : "Verify connection"}
            </Button>
          </div>
          <div className="mt-2 space-y-1">
            {status ? (
              <div
                role="status"
                aria-atomic="true"
                className={
                  {
                    success:
                      "flex items-center gap-2 text-sm text-green-600 dark:text-green-400",
                    error:
                      "flex items-center gap-2 text-sm text-red-600 dark:text-red-400",
                    info: "flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400",
                  }[status.kind]
                }
              >
                {status.kind === "success" ? (
                  <CheckCircle className="h-4 w-4" aria-hidden="true" />
                ) : status.kind === "error" ? (
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                ) : null}
                <span>{status.text}</span>
              </div>
            ) : null}
            {verifyStatus ? (
              <div
                role="status"
                aria-atomic="true"
                className={
                  {
                    success:
                      "flex items-center gap-2 text-sm text-green-600 dark:text-green-400",
                    error:
                      "flex items-center gap-2 text-sm text-red-600 dark:text-red-400",
                    info: "flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400",
                  }[verifyStatus.kind]
                }
              >
                {verifyStatus.kind === "success" ? (
                  <CheckCircle className="h-4 w-4" aria-hidden="true" />
                ) : verifyStatus.kind === "error" ? (
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                ) : null}
                <span>{verifyStatus.text}</span>
              </div>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
