"use client";

import * as React from "react";
import { Plus, Check, X } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import { GlowingEffect } from "~/components/ui/glowing-effect";
import { useAuthSession } from "~/hooks/use-auth-session";
import { requestDiscordLogin } from "~/lib/auth-client";
import { api } from "~/trpc/react";
import { BuiltVersionCreateSchema } from "~/shared/schemas/built-version";
import type { BuiltVersionDto } from "~/shared/types/built-version";

type Phase = "idle" | "loading" | "success";

export default function AddBuiltVersionCard({
  versionId,
  onCreated,
}: {
  versionId: string;
  onCreated?: (item: BuiltVersionDto) => void;
}) {
  const { status } = useAuthSession();
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const createMutation = api.builtVersion.create.useMutation();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const timersRef = React.useRef<number[]>([]);

  React.useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(clearTimeout);
      timersRef.current = [];
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
    const parsed = BuiltVersionCreateSchema.safeParse({ name, versionId });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setPhase("loading");
    try {
      const created = await createMutation.mutateAsync(parsed.data);
      setPhase("success");
      const t = window.setTimeout(() => {
        onCreated?.(created);
        reset();
      }, 700);
      timersRef.current.push(t);
    } catch {
      setPhase("idle");
      setError("Failed to create built version. Please try again.");
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
                You need to be signed in to add a built version.
              </div>
              <div className="flex gap-3">
                <Button
                  disabled={isLoggingIn}
                  onClick={async () => {
                    try {
                      setIsLoggingIn(true);
                      const url = await requestDiscordLogin();
                      window.location.assign(url);
                    } catch (error) {
                      console.error("[Login]", error);
                    } finally {
                      setIsLoggingIn(false);
                    }
                  }}
                >
                  {isLoggingIn ? "Redirecting…" : "Log in with Discord"}
                </Button>
              </div>
            </div>
          </CardContent>
        ) : !open ? (
          <button
            type="button"
            aria-label="Add built version"
            className="flex h-full w-full items-center justify-center"
            onClick={() => setOpen(true)}
          >
            <div className="flex flex-col items-center justify-center text-neutral-400 transition-transform group-hover:scale-105 group-hover:text-neutral-500 dark:text-neutral-500 dark:group-hover:text-neutral-300">
              <Plus className="h-20 w-20" />
              <span className="mt-2 text-sm">New Built Version</span>
            </div>
          </button>
        ) : (
          <CardContent className="min-h-72 p-6">
            {phase === "success" ? (
              <div
                className="flex h-44 flex-col items-center justify-center gap-3"
                role="status"
                aria-atomic="true"
              >
                <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1 text-sm text-emerald-700 ring-1 ring-emerald-200 ring-inset dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-800">
                  <Check className="h-4 w-4" />
                  Built version created
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
                    <h3 className="text-lg font-semibold">New Built Version</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Enter a name to create a built version.
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
                  <Label htmlFor={`built-name-${versionId}`}>Name</Label>
                  <Input
                    id={`built-name-${versionId}`}
                    placeholder="e.g., 1.2.0+build.3"
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
                      This is the name of the built version.
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={phase === "loading"}>
                    {phase === "loading" ? (
                      <span
                        className="inline-flex items-center gap-2"
                        role="status"
                        aria-atomic="true"
                      >
                        Saving
                        <span className="jrm-thinking" />
                      </span>
                    ) : (
                      "Create"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        )}
      </Card>
    </GlowingEffect>
  );
}
