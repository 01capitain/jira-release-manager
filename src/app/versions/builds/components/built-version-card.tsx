"use client";

import * as React from "react";
import { Card, CardContent } from "~/components/ui/card";
import { api } from "~/trpc/react";
import type { BuiltVersionAction } from "~/shared/types/built-version-status";
import {
  labelForAction,
  targetStatusForAction,
  labelForStatus,
  StatusTint,
} from "~/shared/types/built-version-status";
import { Button } from "~/components/ui/button";
import { ComponentVersionLabels } from "./component-version-labels";
import { Separator } from "~/components/ui/separator";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Modal } from "~/components/ui/modal";
import { colorClasses } from "~/shared/ui/color-classes";

export default function BuiltVersionCard({
  id,
  name,
  createdAt: _createdAt,
}: {
  id: string;
  name: string;
  createdAt?: string;
}) {
  const [entered, setEntered] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => {
    const rafId = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(rafId);
  }, []);
  React.useEffect(() => {
    setHydrated(true);
  }, []);

  const { data: statusData, isFetching: fetchingStatus } =
    api.builtVersion.getStatus.useQuery({ builtVersionId: id });
  const currentStatus = statusData?.status ?? "in_development";
  const utils = api.useUtils();
  const handleTransitionSuccess = async (refreshReleases?: boolean) => {
    await utils.builtVersion.getStatus.invalidate({ builtVersionId: id });
    if (refreshReleases) {
      await utils.builtVersion.listReleasesWithBuilds.invalidate();
    }
  };

  const cancelDeployment = api.builtVersion.cancelDeployment.useMutation({
    onSuccess: async () => {
      await handleTransitionSuccess();
    },
    onError: (error) => {
      setLastMessage(`Failed to cancel deployment: ${error.message}`);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = window.setTimeout(() => setLastMessage(""), 3000);
    },
  });
  const markActive = api.builtVersion.markActive.useMutation({
    onSuccess: async () => {
      await handleTransitionSuccess();
    },
    onError: (error) => {
      setLastMessage(`Failed to mark active: ${error.message}`);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = window.setTimeout(() => setLastMessage(""), 3000);
    },
  });
  const revertToDeployment = api.builtVersion.revertToDeployment.useMutation({
    onSuccess: async () => {
      await handleTransitionSuccess();
    },
    onError: (error) => {
      setLastMessage(`Failed to revert to deployment: ${error.message}`);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = window.setTimeout(() => setLastMessage(""), 3000);
    },
  });
  const deprecate = api.builtVersion.deprecate.useMutation({
    onSuccess: async () => {
      await handleTransitionSuccess();
    },
    onError: (error) => {
      setLastMessage(`Failed to deprecate: ${error.message}`);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = window.setTimeout(() => setLastMessage(""), 3000);
    },
  });
  const reactivate = api.builtVersion.reactivate.useMutation({
    onSuccess: async () => {
      await handleTransitionSuccess();
    },
    onError: (error) => {
      setLastMessage(`Failed to reactivate: ${error.message}`);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = window.setTimeout(() => setLastMessage(""), 3000);
    },
  });
  const startDeploymentRaw = api.builtVersion.startDeployment.useMutation({
    onError: (error) => {
      setLastMessage(`Failed to start deployment: ${error.message}`);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = window.setTimeout(() => setLastMessage(""), 3000);
    },
  });
  const createSuccessorBuilt =
    api.builtVersion.createSuccessorBuilt.useMutation();

  const [selecting, setSelecting] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const statusMutationPending =
    cancelDeployment.isPending ||
    markActive.isPending ||
    revertToDeployment.isPending ||
    deprecate.isPending ||
    reactivate.isPending;
  const processing =
    submitting ||
    startDeploymentRaw.isPending ||
    createSuccessorBuilt.isPending;
  const { data: componentsData } = api.releaseComponent.list.useQuery(
    undefined,
    {
      enabled: false, // enabled only when entering selection mode
    },
  );
  const defaultSel = api.builtVersion.defaultSelection.useQuery(
    { builtVersionId: id },
    { enabled: selecting },
  );

  // Color classes imported from shared util to ensure visual parity
  React.useEffect(() => {
    if (!selecting) return;
    // Lazy enable fetch when selection starts
    void utils.releaseComponent.list.fetch();
  }, [selecting, utils.releaseComponent.list]);
  React.useEffect(() => {
    if (!selecting) return;
    const ids = defaultSel.data?.selectedReleaseComponentIds;
    if (ids?.length) {
      setSelectedIds(ids);
    }
  }, [selecting, defaultSel.data]);
  // Fallback: if no prior active selection, select all available components by default
  React.useEffect(() => {
    if (!selecting) return;
    if ((selectedIds?.length ?? 0) > 0) return;
    if (componentsData && componentsData.length > 0) {
      setSelectedIds(componentsData.map((c) => c.id));
    }
  }, [selecting, componentsData, selectedIds]);

  const mutationByAction = {
    cancelDeployment: cancelDeployment.mutateAsync,
    markActive: markActive.mutateAsync,
    revertToDeployment: revertToDeployment.mutateAsync,
    deprecate: deprecate.mutateAsync,
    reactivate: reactivate.mutateAsync,
  } as const;

  const [lastMessage, setLastMessage] = React.useState<string>("");
  const clearTimerRef = React.useRef<number | null>(null);
  const act = async (action: BuiltVersionAction) => {
    if (action === "startDeployment") {
      setSelecting(true);
      return;
    }
    const mutate = mutationByAction[action];
    await mutate({ builtVersionId: id });
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
        <CardContent className="flex h-full flex-col p-0">
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

          <div className="flex-1 p-6" aria-label="Built version details">
            {hydrated && (
              <span role="status" aria-atomic="true" className="sr-only">
                {fetchingStatus ? "Loading status" : `Status ${currentStatus}`}
              </span>
            )}
            {/* Ephemeral action messages for AT users */}
            {lastMessage && (
              <span role="status" aria-atomic="true" className="sr-only">
                {lastMessage}
              </span>
            )}
            {/* Pending state UI suppressed per UX request */}

            <Separator className="my-4" />
            {!selecting && (
              <div aria-busy={processing} className="relative">
                <div className="mb-2 text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                  Components
                </div>
                <ComponentVersionLabels builtVersionId={id} />
                {processing && (
                  <div
                    className="absolute inset-0 bg-white/60 dark:bg-neutral-900/60"
                    aria-hidden
                  />
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <Modal
        open={selecting}
        onOpenChange={(o) => setSelecting(o)}
        title={`Start deployment of version ${name}`}
        description={
          <span>
            Close the version for new developments and select the components
            that will be released with this version.
          </span>
        }
      >
        <div className="space-y-4">
          <div className="text-sm font-medium">Components</div>
          <ScrollArea className="relative h-60 rounded border border-neutral-200 p-2 dark:border-neutral-800">
            {(componentsData?.length ?? 0) === 0 ? (
              <div className="p-2 text-sm text-amber-700 dark:text-amber-400">
                No components available. Create release components first.
              </div>
            ) : (
              <div className="flex flex-col items-start gap-2 p-1">
                {(componentsData ?? []).map((c) => {
                  const isSelected = selectedIds.includes(c.id);
                  const palette = colorClasses(c.color ?? "neutral");
                  const cls = [
                    "inline-flex cursor-pointer items-center rounded-full px-2 py-1 text-xs font-medium ring-1",
                    isSelected
                      ? `${palette.light} ${palette.dark} ${palette.text} ring-transparent`
                      : "bg-transparent text-neutral-900 dark:text-neutral-100 ring-neutral-300 dark:ring-neutral-700",
                  ].join(" ");
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={cls}
                      aria-pressed={isSelected}
                      onClick={() => {
                        setSelectedIds((prev) =>
                          isSelected
                            ? prev.filter((id0) => id0 !== c.id)
                            : [...prev, c.id],
                        );
                      }}
                      title={c.name}
                    >
                      <span className="truncate">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {(createSuccessorBuilt.isPending || submitting) && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 text-sm dark:bg-neutral-900/50">
                preparing Deployments...
              </div>
            )}
          </ScrollArea>
        </div>
        {(createSuccessorBuilt.isPending || submitting) && (
          <div
            role="status"
            aria-atomic="true"
            className="mt-2 text-xs opacity-80"
          >
            preparing Deployments...
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setSelecting(false)}
            disabled={createSuccessorBuilt.isPending || submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={async () => {
              if (selectedIds.length === 0) {
                setLastMessage("Select at least one component");
                if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
                clearTimerRef.current = window.setTimeout(
                  () => setLastMessage(""),
                  1500,
                );
                return;
              }
              setSubmitting(true);
              if (currentStatus === "in_development") {
                await startDeploymentRaw.mutateAsync({
                  builtVersionId: id,
                });
              }
              const res = await createSuccessorBuilt.mutateAsync({
                builtVersionId: id,
                selectedReleaseComponentIds: selectedIds,
              });
              // Prefetch fresh data and set caches to avoid intermediate empty states
              const [status, currentList, releases] = await Promise.all([
                utils.builtVersion.getStatus.fetch({ builtVersionId: id }),
                utils.componentVersion.listByBuilt.fetch({
                  builtVersionId: id,
                }),
                utils.builtVersion.listReleasesWithBuilds.fetch(),
              ]);
              utils.builtVersion.getStatus.setData(
                { builtVersionId: id },
                status,
              );
              utils.componentVersion.listByBuilt.setData(
                { builtVersionId: id },
                currentList,
              );
              utils.builtVersion.listReleasesWithBuilds.setData(
                undefined,
                releases,
              );
              if (res?.summary?.successorBuiltId) {
                const succList = await utils.componentVersion.listByBuilt.fetch(
                  { builtVersionId: res.summary.successorBuiltId },
                );
                utils.componentVersion.listByBuilt.setData(
                  { builtVersionId: res.summary.successorBuiltId },
                  succList,
                );
              }
              setSelecting(false);
              setLastMessage("Deployment finalized");
              if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
              clearTimerRef.current = window.setTimeout(
                () => setLastMessage(""),
                1500,
              );
              setSubmitting(false);
            }}
            disabled={createSuccessorBuilt.isPending || submitting}
          >
            {createSuccessorBuilt.isPending || submitting
              ? "preparing Deployments..."
              : `Close Version ${name}`}
          </Button>
        </div>
      </Modal>
    </>
  );
}
