"use client";

import * as React from "react";
import { Plus, Check, X } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import { GlowingEffect } from "~/components/ui/glowing-effect";

import type { ReleaseVersionDto as ReleaseVersion } from "~/shared/types/release-version";
import { ReleaseVersionCreateSchema } from "~/shared/schemas/release-version";
import { useAuthSession } from "~/hooks/use-auth-session";
import { useDiscordLogin } from "~/hooks/use-discord-login";
import { useCreateReleaseMutation } from "../api";
import { isRestApiError } from "~/lib/rest-client";

type Phase = "idle" | "loading" | "success";

export default function AddReleaseCard({
  onCreated,
}: {
  onCreated?: (item: ReleaseVersion) => void;
}) {
  const { status } = useAuthSession();
  const { login, isLoggingIn, error: loginError } = useDiscordLogin();
  const createMutation = useCreateReleaseMutation();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const timersRef = React.useRef<number[]>([]);

  React.useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  function reset() {
    setName("");
    setError(null);
    setPhase("idle");
    setOpen(false);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (phase === "loading") return;
    const parsed = ReleaseVersionCreateSchema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setPhase("loading");
    try {
      const created = await createMutation.mutateAsync({
        name: parsed.data.name,
      });
      const item: ReleaseVersion = {
        id: created.id,
        name: created.name,
        createdAt: created.createdAt,
      };
      setPhase("success");
      const t = window.setTimeout(() => {
        onCreated?.(item);
        reset();
      }, 700);
      timersRef.current.push(t);
    } catch (err) {
      setPhase("idle");
      setError(
        isRestApiError(err)
          ? err.message
          : "Failed to create release. Please try again.",
      );
    }
  }

  return (
    <GlowingEffect
      active={phase !== "idle"}
      color={phase === "loading" ? "neutral" : "emerald"}
      thickness={phase !== "idle" ? "thick" : "thin"}
      className="h-full"
    >
      <Card
        className={cn(
          "group relative h-72 overflow-hidden transition-shadow hover:shadow-md",
          status !== "authenticated"
            ? "cursor-default opacity-75"
            : open
              ? "cursor-default"
              : "cursor-pointer",
          phase === "loading"
            ? "border-neutral-300/60 dark:border-neutral-700/60"
            : undefined,
        )}
      >
        {status !== "authenticated" ? (
          <CardContent className="min-h-72 p-6">
            <div className="flex h-44 flex-col items-center justify-center gap-3 text-center">
              <div className="text-sm text-neutral-600 dark:text-neutral-300">
                You need to be signed in to create a new release version.
              </div>
              <div className="flex gap-3">
                <Button disabled={isLoggingIn} onClick={() => login()}>
                  {isLoggingIn ? "Redirecting…" : "Log in with Discord"}
                </Button>
              </div>
              {loginError ? (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  Failed to sign in with Discord: {loginError}
                </p>
              ) : null}
            </div>
          </CardContent>
        ) : !open ? (
          <button
            type="button"
            aria-label="Add release version"
            className="flex h-full w-full items-center justify-center"
            onClick={() => setOpen(true)}
          >
            <div className="flex flex-col items-center justify-center text-neutral-400 transition-transform group-hover:scale-105 group-hover:text-neutral-500 dark:text-neutral-500 dark:group-hover:text-neutral-300">
              <Plus className="h-20 w-20" />
              <span className="mt-2 text-sm">New Release Version</span>
            </div>
          </button>
        ) : (
          <CardContent className="min-h-72 p-6">
            {phase === "success" ? (
              <div className="animate-in flex h-44 flex-col items-center justify-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  <Check className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Release version created
                  </p>
                  <p className="text-base font-medium">{name}</p>
                </div>
                <Button className="mt-1" onClick={reset} variant="secondary">
                  Add another
                </Button>
              </div>
            ) : (
              <form
                onSubmit={onSubmit}
                className="space-y-4"
                aria-busy={phase === "loading"}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      New Release Version
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Enter details to create a release.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={reset}
                    aria-label="Close"
                    disabled={phase === "loading"}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="release-name">Name</Label>
                  <Input
                    id="release-name"
                    placeholder="e.g., 1.2.0"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={phase === "loading"}
                    className={cn(
                      error &&
                        "border-red-500 focus-visible:ring-red-600 dark:border-red-600",
                    )}
                  />
                  {error ? (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {error}
                    </p>
                  ) : (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      This will be the tag of your release.
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={phase === "loading"}>
                    {phase === "loading" ? (
                      <span className="inline-flex items-center gap-2">
                        Saving
                        <span className="jrm-thinking" />
                      </span>
                    ) : (
                      "Create"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={reset}
                    disabled={phase === "loading"}
                  >
                    Cancel
                  </Button>
                </div>
                {phase === "loading" && (
                  <div
                    className="pointer-events-none absolute inset-0 flex items-center justify-center bg-neutral-100/70 text-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-200"
                    role="status"
                    aria-atomic="true"
                  >
                    <span className="text-sm font-medium">
                      Thinking
                      <span className="jrm-thinking" />
                    </span>
                  </div>
                )}
              </form>
            )}
          </CardContent>
        )}
      </Card>
    </GlowingEffect>
  );
}
