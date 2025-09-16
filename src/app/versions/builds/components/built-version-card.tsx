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
  nextActionsForStatus,
  labelForAction,
} from "~/shared/types/built-version-status";
import { Button } from "~/components/ui/button";
import { ComponentVersionLabels } from "./component-version-labels";

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
  const actions = nextActionsForStatus(currentStatus);
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

  return (
    <Card
      className={[
        "group relative h-72 overflow-hidden hover:shadow-md",
        "transition-all duration-500 ease-out motion-reduce:transition-none",
        entered
          ? "translate-y-0 scale-100 opacity-100 motion-reduce:transform-none motion-reduce:opacity-100"
          : "-translate-y-2 scale-95 opacity-0 motion-reduce:transform-none motion-reduce:opacity-100",
      ].join(" ")}
    >
      <CardContent className="flex h-full flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="text-2xl font-semibold tracking-tight">{name}</div>
          <div className="mt-2 flex items-center justify-center gap-2">
            {/* Status badge */}
            {(() => {
              const c = StatusBadgeColor[currentStatus];
              const cls = [
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                c.light,
                c.dark,
                c.text,
              ].join(" ");
              const label = currentStatus.replace(/_/g, " ");
              return (
                <span className={cls} aria-label={`Status ${label}`}>
                  {label}
                </span>
              );
            })()}
            {hydrated && (
              <span role="status" aria-atomic="true" className="sr-only">
                {fetchingStatus ? "Loading status" : `Status ${currentStatus}`}
              </span>
            )}
          </div>
          {createdAt ? (
            <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              {(() => {
                const d = new Date(createdAt);
                if (Number.isNaN(d.getTime())) return createdAt;
                const iso = d.toISOString();
                const local = d.toLocaleString();
                return (
                  <time dateTime={iso} title={local} suppressHydrationWarning>
                    {hydrated ? local : iso}
                  </time>
                );
              })()}
            </div>
          ) : null}
        </div>
        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {actions.map((a) => (
            <Button
              key={a}
              type="button"
              size="sm"
              variant="outline"
              disabled={transition.isPending}
              onClick={() => void act(a)}
              aria-label={labelForAction(a)}
            >
              {labelForAction(a)}
            </Button>
          ))}
        </div>
        {hydrated && (
          <span role="status" aria-atomic="true" className="sr-only">
            {transition.isPending
              ? "Applying transition"
              : lastMessage || "Idle"}
          </span>
        )}
        <ComponentVersionLabels builtVersionId={id} />
      </CardContent>
    </Card>
  );
}
