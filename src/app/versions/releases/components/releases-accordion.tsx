"use client";

import {
  Calendar as CalendarIcon,
  ChevronDown,
  List as ListIcon,
} from "lucide-react";
import * as React from "react";
import type { ReleaseVersionWithBuildsDto } from "~/shared/types/release-version-with-builds";
import type { BuiltVersionStatusResponse } from "~/shared/types/built-version-status-response";
import {
  STATUS_STALE_TIME_MS,
  useBuiltVersionStatusQuery,
} from "../../builds/api";
import BuiltVersionCard from "../../builds/components/built-version-card";
import { useReleaseEntities } from "../api";
import { Button } from "~/components/ui/button";
import ReleaseCalendar from "./release-calendar";
import { mapBuiltVersionsToCalendarEvents } from "../lib/calendar-events";

function LatestActiveTag({
  builtVersionIds,
  builtVersionNames,
  statusSnapshots,
}: {
  builtVersionIds: string[];
  builtVersionNames: string[];
  statusSnapshots: Record<string, BuiltVersionStatusResponse | undefined>;
}) {
  // Query at most the first 5 builds for status to find the latest active,
  // but keep hook count/order stable across renders to satisfy the Rules of Hooks.
  const NIL_UUID = "00000000-0000-0000-0000-000000000000";
  const statusOptions = (index: number) => ({
    staleTime: STATUS_STALE_TIME_MS,
    enabled: builtVersionIds[index] !== undefined,
    initialData: statusSnapshots[builtVersionIds[index] ?? ""],
  });
  const q0 = useBuiltVersionStatusQuery(
    builtVersionIds[0] ?? NIL_UUID,
    statusOptions(0),
  );
  const q1 = useBuiltVersionStatusQuery(builtVersionIds[1] ?? NIL_UUID, {
    ...statusOptions(1),
  });
  const q2 = useBuiltVersionStatusQuery(builtVersionIds[2] ?? NIL_UUID, {
    ...statusOptions(2),
  });
  const q3 = useBuiltVersionStatusQuery(builtVersionIds[3] ?? NIL_UUID, {
    ...statusOptions(3),
  });
  const q4 = useBuiltVersionStatusQuery(builtVersionIds[4] ?? NIL_UUID, {
    ...statusOptions(4),
  });
  const queries = [q0, q1, q2, q3, q4];

  const activeIdx = (() => {
    for (let i = 0; i < queries.length; i++) {
      if (queries[i]?.data?.status === "active") {
        return i;
      }
    }
    return -1;
  })();

  if (activeIdx < 0) return null;
  const name = builtVersionNames[activeIdx]!;
  return (
    <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-200">
      Active: {name}
    </span>
  );
}

type ReleasesAccordionProps = {
  releaseComponentLookup: Record<string, { color?: string }>;
};

export default function ReleasesAccordion({
  releaseComponentLookup,
}: ReleasesAccordionProps) {
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => setHydrated(true), []);
  const [viewModeByRelease, setViewModeByRelease] = React.useState<
    Record<string, "list" | "calendar">
  >({});

  const { releases, isFetching, builtStatusById, componentStateByBuiltId } =
    useReleaseEntities({ enabled: true });

  const normalizedReleases: ReleaseVersionWithBuildsDto[] = releases ?? [];

  return (
    <div className="space-y-5">
      {normalizedReleases.map((rel) => {
        const ids = rel.builtVersions.map((b) => b.id);
        const names = rel.builtVersions.map((b) => b.name);
        const mode = viewModeByRelease[rel.id] ?? "list";
        const calendarEvents = mapBuiltVersionsToCalendarEvents(
          rel,
          [],
          releaseComponentLookup,
        );
        return (
          <details
            key={rel.id}
            className="group rounded-md border border-neutral-200 dark:border-neutral-800"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md bg-neutral-50 px-4 py-2 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
              <div className="flex items-center gap-2">
                <span className="text-base font-medium">
                  Release {rel.name}
                </span>
                {/* When collapsed, show latest active built version */}
                <LatestActiveTag
                  builtVersionIds={ids}
                  builtVersionNames={names}
                  statusSnapshots={builtStatusById}
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <span className="text-xs">
                  {rel.builtVersions.length} builds
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={
                    mode === "calendar"
                      ? `View list for release ${rel.name}`
                      : `View calendar for release ${rel.name}`
                  }
                  className="hidden group-open:inline-flex"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setViewModeByRelease((prev) => ({
                      ...prev,
                      [rel.id]: mode === "calendar" ? "list" : "calendar",
                    }));
                  }}
                >
                  {mode === "calendar" ? (
                    <ListIcon className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <CalendarIcon className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
                <ChevronDown
                  className="h-4 w-4 text-neutral-600 transition-transform group-open:rotate-180 dark:text-neutral-300"
                  aria-hidden="true"
                />
              </div>
            </summary>
            <div className="p-4">
              {mode === "calendar" ? (
                <ReleaseCalendar release={rel} events={calendarEvents} />
              ) : (
                <div className="relative grid w-full grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {rel.builtVersions.map((b) => {
                    const componentState = componentStateByBuiltId[b.id];
                    const componentsLoading =
                      componentState?.status === "loading";
                    const componentsError =
                      componentState?.status === "error"
                        ? componentState.error
                        : undefined;
                    return (
                      <BuiltVersionCard
                        key={b.id}
                        id={b.id}
                        name={b.name}
                        createdAt={b.createdAt}
                        releaseId={rel.id}
                        components={b.deployedComponents ?? []}
                        componentsLoading={componentsLoading}
                        componentsError={componentsError}
                        initialStatus={builtStatusById[b.id]}
                      />
                    );
                  })}
                  {hydrated && isFetching && (
                    <output
                      className="pointer-events-none absolute inset-0 flex items-center justify-center bg-neutral-100/40 text-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-200"
                      aria-atomic="true"
                    >
                      <span className="text-sm font-medium">
                        Refreshing
                        <span className="jrm-thinking" />
                      </span>
                    </output>
                  )}
                </div>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
