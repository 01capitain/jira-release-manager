"use client";

import { useMutation } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { ScrollArea } from "~/components/ui/scroll-area";
import type { PatchAction, PatchStatus } from "~/shared/types/patch-status";
import {
  labelForAction,
  labelForStatus,
  StatusTint,
  targetStatusForAction,
} from "~/shared/types/patch-status";
import { transitionPatch, useReleasesWithPatchesRefetch } from "../api";
import type { PatchTransitionResponse } from "../api";
import { ComponentVersionLabels } from "./component-version-labels";
import type { ComponentVersionDto } from "~/shared/types/component-version";
import type { PatchStatusResponse } from "~/shared/types/patch-status-response";

export default function PatchCard({
  id,
  name,
  createdAt: _createdAt,
  releaseId,
  components,
  componentsLoading,
  componentsError,
  initialStatus,
}: {
  id: string;
  name: string;
  createdAt?: string;
  releaseId: string;
  components: ComponentVersionDto[];
  componentsLoading?: boolean;
  componentsError?: string;
  initialStatus?: PatchStatusResponse;
}) {
  const { setData: setReleasesWithPatches } = useReleasesWithPatchesRefetch();
  const [entered, setEntered] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => {
    const rafId = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(rafId);
  }, []);
  React.useEffect(() => {
    setHydrated(true);
  }, []);

  const [statusSnapshot, setStatusSnapshot] =
    React.useState<PatchStatusResponse>(() => ({
      status: initialStatus?.status ?? "in_development",
      history: initialStatus?.history ?? [],
    }));

  React.useEffect(() => {
    if (!initialStatus) return;
    setStatusSnapshot(initialStatus);
  }, [initialStatus]);

  const updateStatusSnapshot = React.useCallback(
    (next: PatchStatusResponse) => {
      setStatusSnapshot(next);
      setReleasesWithPatches((current) => {
        if (!current) return current;
        let changed = false;
        const nextReleases = current.map((release) => {
          const patchIndex = release.patches.findIndex(
            (patch) => patch.id === id,
          );
          if (patchIndex === -1) return release;
          changed = true;
          const nextPatches = release.patches.map((patch) =>
            patch.id === id
              ? {
                  ...patch,
                  currentStatus: next.status,
                  transitions: next.history.map((entry) => ({
                    ...entry,
                    patchId: patch.id,
                  })),
                  hasStatusData: true,
                }
              : patch,
          );
          return { ...release, patches: nextPatches };
        });
        return changed ? nextReleases : current;
      });
    },
    [id, setReleasesWithPatches],
  );

  const currentStatus: PatchStatus = statusSnapshot.status;
  const applyTransitionResult = React.useCallback(
    (result: PatchTransitionResponse) => {
      updateStatusSnapshot({
        status: result.status,
        history: result.history,
      });
    },
    [updateStatusSnapshot],
  );
  const handleMutationError = (prefix: string) => (error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    setLastMessage(`${prefix}: ${message}`);
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = window.setTimeout(() => setLastMessage(""), 3000);
  };

  const cancelDeployment = useMutation({
    mutationFn: () =>
      transitionPatch({
        releaseId,
        patchId: id,
        action: "cancelDeployment",
      }),
    onSuccess: (result) => {
      applyTransitionResult(result);
    },
    onError: handleMutationError("Failed to cancel deployment"),
  });

  const markActive = useMutation({
    mutationFn: () =>
      transitionPatch({
        releaseId,
        patchId: id,
        action: "markActive",
      }),
    onSuccess: (result) => {
      applyTransitionResult(result);
    },
    onError: handleMutationError("Failed to mark active"),
  });

  const revertToDeployment = useMutation({
    mutationFn: () =>
      transitionPatch({
        releaseId,
        patchId: id,
        action: "revertToDeployment",
      }),
    onSuccess: (result) => {
      applyTransitionResult(result);
    },
    onError: handleMutationError("Failed to revert to deployment"),
  });

  const deprecate = useMutation({
    mutationFn: () =>
      transitionPatch({
        releaseId,
        patchId: id,
        action: "deprecate",
      }),
    onSuccess: (result) => {
      applyTransitionResult(result);
    },
    onError: handleMutationError("Failed to deprecate"),
  });

  const reactivate = useMutation({
    mutationFn: () =>
      transitionPatch({
        releaseId,
        patchId: id,
        action: "reactivate",
      }),
    onSuccess: (result) => {
      applyTransitionResult(result);
    },
    onError: handleMutationError("Failed to reactivate"),
  });

  const startDeployment = useMutation({
    mutationFn: () =>
      transitionPatch({
        releaseId,
        patchId: id,
        action: "startDeployment",
      }),
    onSuccess: (result) => {
      applyTransitionResult(result);
    },
    onError: handleMutationError("Failed to start deployment"),
  });

  const statusMutationPending =
    cancelDeployment.isPending ||
    markActive.isPending ||
    revertToDeployment.isPending ||
    deprecate.isPending ||
    reactivate.isPending ||
    startDeployment.isPending;
  const fetchingStatus = statusMutationPending;
  const processing = startDeployment.isPending;

  const mutationByAction = {
    cancelDeployment: cancelDeployment.mutateAsync,
    markActive: markActive.mutateAsync,
    revertToDeployment: revertToDeployment.mutateAsync,
    deprecate: deprecate.mutateAsync,
    reactivate: reactivate.mutateAsync,
    startDeployment: startDeployment.mutateAsync,
    setActive: markActive.mutateAsync,
    archive: deprecate.mutateAsync,
  } as const;

  const [lastMessage, setLastMessage] = React.useState<string>("");
  const clearTimerRef = React.useRef<number | null>(null);
  const act = async (action: PatchAction) => {
    const mutate = mutationByAction[action];
    await mutate();
    setLastMessage(`${labelForAction(action)} done`);
    // Clear message after a short delay
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
    }
    clearTimerRef.current = window.setTimeout(() => setLastMessage(""), 1500);
  };
  React.useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, []);

  // Use static tint classes so Tailwind includes them
  const tints = StatusTint[currentStatus];

  return (
    <>
      <Card
        className={[
          "group relative h-72 overflow-hidden hover:shadow-md",
          "transition-all duration-500 ease-out motion-reduce:transition-none",
          entered
            ? "translate-y-0 scale-100 opacity-100 motion-reduce:transform-none motion-reduce:opacity-100"
            : "-translate-y-2 scale-95 opacity-0 motion-reduce:transform-none motion-reduce:opacity-100",
          tints.bodyLight,
          tints.bodyDark,
        ].join(" ")}
      >
        <CardContent className="flex h-full min-h-0 flex-col p-0">
          {/* Colored header by status */}
          {(() => {
            // const c = StatusBadgeColor[currentStatus];
            // Determine adjacent actions
            const forward = (() => {
              switch (currentStatus) {
                case "in_development":
                  return "startDeployment" as const;
                case "in_deployment":
                  return "markActive" as const;
                case "active":
                  return "deprecate" as const;
                case "deprecated":
                  return undefined;
              }
            })();
            const backward = (() => {
              switch (currentStatus) {
                case "in_development":
                  return undefined;
                case "in_deployment":
                  return "cancelDeployment" as const;
                case "active":
                  return "revertToDeployment" as const;
                case "deprecated":
                  return "reactivate" as const;
              }
            })();
            const headerLight = tints.headerLight;
            const headerDark = tints.headerDark;
            return (
              <div
                className={[
                  headerLight,
                  headerDark,
                  "relative py-1.5 pr-12 pl-14 text-neutral-900 dark:text-neutral-100",
                ].join(" ")}
                aria-labelledby="bv-title"
              >
                {/* Backward (absolute, keeps content position stable) */}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute top-1/2 left-2 h-8 w-8 -translate-y-1/2"
                  disabled={!backward || statusMutationPending}
                  aria-label={
                    backward
                      ? `${labelForAction(backward)} to ${labelForStatus(targetStatusForAction(backward))}`
                      : "No previous status"
                  }
                  onClick={() => backward && void act(backward)}
                  title={
                    backward
                      ? `Back: ${labelForStatus(targetStatusForAction(backward))}`
                      : "No previous status"
                  }
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                {/* Left-aligned name + status stacked */}
                <div className="min-w-0">
                  <div id="bv-title" className="truncate text-2xl font-bold">
                    {name}
                  </div>
                  <div className="truncate text-xs opacity-90">
                    {labelForStatus(currentStatus)}
                  </div>
                </div>

                {/* Forward (absolute, keeps content position stable) */}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute top-1/2 right-2 h-8 w-8 -translate-y-1/2"
                  disabled={!forward || statusMutationPending}
                  aria-label={
                    forward
                      ? `${labelForAction(forward)} to ${labelForStatus(targetStatusForAction(forward))}`
                      : "No next status"
                  }
                  onClick={() => forward && void act(forward)}
                  title={
                    forward
                      ? `Next: ${labelForStatus(targetStatusForAction(forward))}`
                      : "No next status"
                  }
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            );
          })()}

          <ScrollArea className="flex-1" aria-label="Patch details">
            <div className="p-6">
              {hydrated && (
                <span role="status" aria-atomic="true" className="sr-only">
                  {fetchingStatus
                    ? "Loading status"
                    : `Status ${currentStatus}`}
                </span>
              )}
              {/* Ephemeral action messages for AT users */}
              {lastMessage && (
                <span role="status" aria-atomic="true" className="sr-only">
                  {lastMessage}
                </span>
              )}

              <div aria-busy={processing} className="relative">
                <div className="mb-2 text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                  Components
                </div>
                <ComponentVersionLabels
                  versions={components}
                  isLoading={componentsLoading}
                  error={componentsError}
                />
                {processing && (
                  <div
                    className="absolute inset-0 bg-white/60 dark:bg-neutral-900/60"
                    aria-hidden
                  />
                )}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
}
