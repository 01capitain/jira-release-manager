"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import type { BuiltVersionStatus } from "~/shared/types/built-version-status";
import type { ReleaseVersionWithBuildsDto } from "~/shared/types/release-version-with-builds";
import BuiltVersionCard from "../../builds/components/built-version-card";
import { ChevronDown } from "lucide-react";

function LatestActiveTag({
  builtVersionIds,
  builtVersionNames,
}: {
  builtVersionIds: string[];
  builtVersionNames: string[];
}) {
  // Query at most the first 5 builds for status to find the latest active,
  // but keep hook count/order stable across renders to satisfy the Rules of Hooks.
  const NIL_UUID = "00000000-0000-0000-0000-000000000000";
  const slots = [0, 1, 2, 3, 4] as const;
  const queries = slots.map((i) =>
    api.builtVersion.getStatus.useQuery(
      { builtVersionId: builtVersionIds[i] ?? NIL_UUID },
      {
        staleTime: Infinity,
        enabled: builtVersionIds[i] !== undefined,
      },
    ),
  );

  const activeIdx = React.useMemo(() => {
    for (let i = 0; i < queries.length; i++) {
      const status = queries[i]?.data?.status as BuiltVersionStatus | undefined;
      if (status === "active") return i;
    }
    return -1;
  }, [queries]);

  if (activeIdx < 0) return null;
  const name = builtVersionNames[activeIdx]!;
  return (
    <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-200">
      Active: {name}
    </span>
  );
}

export default function ReleasesAccordion() {
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => setHydrated(true), []);

  // Cache releases-with-builds in localStorage
  const storageKey = () => `jrm:releases:accordion:releases-with-builds:v1`;
  const readCache = () => {
    try {
      const raw = localStorage.getItem(storageKey());
      if (!raw) return undefined;
      const parsed = JSON.parse(raw) as ReleaseVersionWithBuildsDto[];
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return undefined;
  };
  const writeCache = React.useCallback(
    (payload: ReleaseVersionWithBuildsDto[]) => {
      try {
        localStorage.setItem(storageKey(), JSON.stringify(payload));
      } catch {}
    },
    [],
  );

  const { data, isFetching } = api.builtVersion.listReleasesWithBuilds.useQuery(
    undefined,
    {
      staleTime: Infinity,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      placeholderData: () => (hydrated ? readCache() : undefined),
    },
  );

  React.useEffect(() => {
    if (data) writeCache(data);
  }, [data, writeCache]);

  const releases = (data ?? []) as ReleaseVersionWithBuildsDto[];

  return (
    <div className="space-y-5">
      {releases.map((rel) => {
        const ids = rel.builtVersions.map((b) => b.id);
        const names = rel.builtVersions.map((b) => b.name);
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
                />
              </div>
              <span className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <span>{rel.builtVersions.length} builds</span>
                <ChevronDown
                  className="h-4 w-4 text-neutral-600 transition-transform group-open:rotate-180 dark:text-neutral-300"
                  aria-hidden="true"
                />
              </span>
            </summary>
            <div className="p-4">
              <div className="relative grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
                {rel.builtVersions.map((b) => (
                  <BuiltVersionCard
                    key={b.id}
                    id={b.id}
                    name={b.name}
                    createdAt={b.createdAt}
                  />
                ))}
                {hydrated && isFetching && (
                  <div
                    className="pointer-events-none absolute inset-0 flex items-center justify-center bg-neutral-100/40 text-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-200"
                    role="status"
                    aria-atomic="true"
                  >
                    <span className="text-sm font-medium">
                      Refreshing
                      <span className="jrm-thinking" />
                    </span>
                  </div>
                )}
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
