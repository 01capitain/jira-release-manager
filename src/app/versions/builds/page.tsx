"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import type { ReleaseVersionWithBuildsDto } from "~/shared/types/release-version-with-builds";
import { Button } from "~/components/ui/button";
import { RefreshCw } from "lucide-react";
import AddBuiltVersionCard from "./components/add-built-version-card";
import BuiltVersionCard from "./components/built-version-card";

export default function VersionsBuildsPage() {
  const utils = api.useUtils();
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => {
    setHydrated(true);
  }, []);

  // Simple localStorage cache for releases-with-builds
  const storageKey = () => `jrm:builds:releases-with-builds:v1`;
  const readCache = () => {
    try {
      const raw = localStorage.getItem(storageKey());
      if (!raw) return undefined;
      const parsed = JSON.parse(raw) as ReleaseVersionWithBuildsDto[];
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore
    }
    return undefined;
  };
  const writeCache = (payload: ReleaseVersionWithBuildsDto[]) => {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(payload));
    } catch {
      // ignore quota/permissions
    }
  };

  const { data, isFetching, refetch } =
    api.builtVersion.listReleasesWithBuilds.useQuery(undefined, {
      staleTime: Infinity,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      placeholderData: () => (hydrated ? readCache() : undefined),
    });

  React.useEffect(() => {
    if (data) writeCache(data as ReleaseVersionWithBuildsDto[]);
  }, [data]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Built Versions
        </h1>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
          aria-label="Reload built versions"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {isFetching ? "Refreshing" : "Refresh"}
        </Button>
        {hydrated && (
          <span role="status" aria-atomic="true" className="sr-only">
            {isFetching
              ? "Refreshing built versions"
              : "Built versions up to date"}
          </span>
        )}
      </div>

      {(data ?? []).map((rel) => (
        <section key={rel.id} aria-labelledby={`release-${rel.id}`}>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id={`release-${rel.id}`} className="text-lg font-medium">
              Release {rel.name}
            </h2>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {rel.builtVersions.length} builds
            </span>
          </div>
          <div className="relative grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
            <AddBuiltVersionCard
              versionId={rel.id}
              onCreated={(created) => {
                // Optimistically update cache for this release
                utils.builtVersion.listReleasesWithBuilds.setData(
                  undefined,
                  (old) =>
                    (old ?? []).map((it) =>
                      it.id === rel.id
                        ? {
                            ...it,
                            builtVersions: [created, ...it.builtVersions],
                          }
                        : it,
                    ),
                );
              }}
            />
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
        </section>
      ))}
    </div>
  );
}
