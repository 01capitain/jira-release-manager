"use client";

import * as React from "react";
import { Card, CardContent } from "~/components/ui/card";
import { api } from "~/trpc/react";
import type {
  BuiltVersionAction,
  BuiltVersionStatus,
} from "~/shared/types/built-version-status";
import {
  StatusBadgeColor,
  labelForAction,
  targetStatusForAction,
  labelForStatus,
  StatusTint,
} from "~/shared/types/built-version-status";
import { Button } from "~/components/ui/button";
import { ComponentVersionLabels } from "./component-version-labels";
import { Separator } from "~/components/ui/separator";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

export default function BuiltVersionCard({
  id,
  name,
  createdAt,
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
  const currentStatus = (statusData?.status ?? "in_development") as BuiltVersionStatus;
  const utils = api.useUtils();
  const transition = api.builtVersion.transition.useMutation({
    onSuccess: async () => {
      await utils.builtVersion.getStatus.invalidate({ builtVersionId: id });
    },
  });

  const [lastMessage, setLastMessage] = React.useState<string>("");
  const act = async (action: BuiltVersionAction) => {
    await transition.mutateAsync({ builtVersionId: id, action });
    setLastMessage(`${labelForAction(action)} done`);
    // Clear message after a short delay
    setTimeout(() => setLastMessage(""), 1500);
  };

  // Use static tint classes so Tailwind includes them
  const tints = StatusTint[currentStatus];

  return (
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
          const c = StatusBadgeColor[currentStatus];
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
              className={[headerLight, headerDark, "relative pl-14 pr-12 py-1.5 text-neutral-900 dark:text-neutral-100"].join(" ")}
              aria-label={`Header for status ${labelForStatus(currentStatus)}`}
            >
              {/* Backward (absolute, keeps content position stable) */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="absolute left-2 top-1/2 h-8 w-8 -translate-y-1/2"
                disabled={!backward || transition.isPending}
                aria-label={backward ? `${labelForAction(backward)} to ${labelForStatus(targetStatusForAction(backward))}` : "No previous status"}
                onClick={() => backward && void act(backward)}
                title={backward ? `Back: ${labelForStatus(targetStatusForAction(backward))}` : "No previous status"}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              {/* Left-aligned name + status stacked */}
              <div className="min-w-0">
                <div className="truncate text-2xl font-bold">{name}</div>
                <div className="truncate text-xs opacity-90">{labelForStatus(currentStatus)}</div>
              </div>

              {/* Forward (absolute, keeps content position stable) */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2"
                disabled={!forward || transition.isPending}
                aria-label={forward ? `${labelForAction(forward)} to ${labelForStatus(targetStatusForAction(forward))}` : "No next status"}
                onClick={() => forward && void act(forward)}
                title={forward ? `Next: ${labelForStatus(targetStatusForAction(forward))}` : "No next status"}
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
        {/* Pending state UI suppressed per UX request */}

        <Separator className="my-4" />
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Components
          </div>
          <ComponentVersionLabels builtVersionId={id} />
        </div>
        </div>
      </CardContent>
    </Card>
  );
}
