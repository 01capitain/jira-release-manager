"use client";

import * as React from "react";
import { Plus, Check, X, ChevronDown } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import { GlowingEffect } from "~/components/ui/glowing-effect";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

import type { ReleaseVersionDto as ReleaseVersion } from "~/shared/types/release-version";
import { ReleaseVersionCreateSchema } from "~/shared/schemas/release-version";
import {
  DEFAULT_RELEASE_TRACK,
  RELEASE_TRACK_VALUES,
  type ReleaseTrack,
} from "~/shared/types/release-track";
import { useAuthSession } from "~/hooks/use-auth-session";
import { useDiscordLogin } from "~/hooks/use-discord-login";
import { useCreateReleaseMutation, useReleaseDefaultsQuery } from "../api";
import { isRestApiError } from "~/lib/rest-client";

type Phase = "idle" | "loading" | "success";

const TRACK_STYLE_MAP: Record<
  ReleaseTrack,
  { swatch: string; border: string; optionDot: string; optionHover: string }
> = {
  Future: {
    swatch: "bg-purple-400/80 dark:bg-purple-500/70",
    border: "border-purple-400/80 dark:border-purple-400/60",
    optionDot: "bg-purple-400",
    optionHover: "hover:bg-purple-50/80 dark:hover:bg-purple-900/40",
  },
  Beta: {
    swatch: "bg-sky-400/80 dark:bg-sky-500/70",
    border: "border-sky-400/70 dark:border-sky-400/60",
    optionDot: "bg-sky-400",
    optionHover: "hover:bg-sky-50/80 dark:hover:bg-sky-900/40",
  },
  Rollout: {
    swatch: "bg-yellow-300/90 dark:bg-yellow-400/70",
    border: "border-yellow-400/70 dark:border-yellow-400/60",
    optionDot: "bg-yellow-300",
    optionHover: "hover:bg-yellow-50/80 dark:hover:bg-yellow-900/40",
  },
  Active: {
    swatch: "bg-emerald-400/80 dark:bg-emerald-500/70",
    border: "border-emerald-400/70 dark:border-emerald-400/60",
    optionDot: "bg-emerald-400",
    optionHover: "hover:bg-emerald-50/80 dark:hover:bg-emerald-900/40",
  },
  Archived: {
    swatch: "bg-neutral-400/70 dark:bg-neutral-500/70",
    border: "border-neutral-400/70 dark:border-neutral-400/60",
    optionDot: "bg-neutral-400",
    optionHover: "hover:bg-neutral-100/80 dark:hover:bg-neutral-800/60",
  },
};

export default function AddReleaseCard({
  onCreated,
}: {
  onCreated?: (item: ReleaseVersion) => void;
}) {
  const { status } = useAuthSession();
  const { login, isLoggingIn, error: loginError } = useDiscordLogin();
  const createMutation = useCreateReleaseMutation();
  const [releaseTrack, setReleaseTrack] = React.useState<ReleaseTrack>(
    DEFAULT_RELEASE_TRACK,
  );
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [trackPopoverOpen, setTrackPopoverOpen] = React.useState(false);
  const timersRef = React.useRef<number[]>([]);
  const defaultsQuery = useReleaseDefaultsQuery({ enabled: open });

  React.useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  function reset() {
    setName(defaultsQuery.data?.name ?? "");
    setError(null);
    setPhase("idle");
    setOpen(false);
    setReleaseTrack(defaultsQuery.data?.releaseTrack ?? DEFAULT_RELEASE_TRACK);
    setTrackPopoverOpen(false);
  }

  React.useEffect(() => {
    if (defaultsQuery.data) {
      setName((prev) => (prev ? prev : (defaultsQuery.data?.name ?? "")));
      setReleaseTrack((prev) =>
        prev !== DEFAULT_RELEASE_TRACK
          ? prev
          : (defaultsQuery.data.releaseTrack ?? DEFAULT_RELEASE_TRACK)
      );
    }
  }, [defaultsQuery.data]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (phase === "loading") return;
    const parsed = ReleaseVersionCreateSchema.safeParse({
      name,
      releaseTrack,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setPhase("loading");
    try {
      const created = await createMutation.mutateAsync({
        name: parsed.data.name,
        releaseTrack: parsed.data.releaseTrack,
      });
      const item: ReleaseVersion = {
        id: created.id,
        name: created.name,
        releaseTrack: created.releaseTrack,
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

                <div className="space-y-2">
                  <Label htmlFor="release-track">Release track</Label>
                  <Popover
                    open={trackPopoverOpen}
                    onOpenChange={setTrackPopoverOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        id="release-track"
                        variant="outline"
                        className="flex w-full items-center justify-between"
                        disabled={phase === "loading"}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={`h-4 w-4 rounded-full ${TRACK_STYLE_MAP[releaseTrack]?.swatch ?? TRACK_STYLE_MAP.Future.swatch}`}
                          />
                          {releaseTrack}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-70" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3">
                      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-300">
                        Choose the initial lifecycle
                      </p>
                      <div className="mt-2 space-y-1">
                        {RELEASE_TRACK_VALUES.map((track) => {
                          const optionStyles = TRACK_STYLE_MAP[track];
                          const isSelected = track === releaseTrack;
                          return (
                            <button
                              key={track}
                              type="button"
                              onClick={() => {
                                setReleaseTrack(track);
                                setTrackPopoverOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left transition ${optionStyles.optionHover} ${
                                isSelected
                                  ? "ring-2 ring-offset-1 ring-offset-white dark:ring-offset-neutral-900"
                                  : ""
                              }`}
                              disabled={phase === "loading"}
                            >
                              <span className="flex items-center gap-2">
                                <span
                                  aria-hidden="true"
                                  className={`h-3 w-3 rounded-full ${optionStyles.optionDot}`}
                                />
                                {track}
                              </span>
                              {isSelected ? (
                                <Check
                                  className="h-4 w-4 text-neutral-600 dark:text-neutral-300"
                                  aria-hidden="true"
                                />
                              ) : (
                                <span className="h-4 w-4" aria-hidden="true" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Sets the starting lifecycle for this release.
                  </p>
                  {defaultsQuery.isFetching ? (
                    <p
                      role="status"
                      aria-atomic="true"
                      className="text-xs text-neutral-500 dark:text-neutral-400"
                    >
                      Loading suggestions…
                    </p>
                  ) : null}
                  {defaultsQuery.isError ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Defaults unavailable, using fallback values.
                    </p>
                  ) : null}
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
