"use client";

import * as React from "react";
import AddReleaseCard from "./components/add-release-card";
import ReleaseCard from "./components/release-card";
import type { ReleaseVersionDto as ReleaseVersion } from "~/shared/types/release-version";
import { Pagination } from "~/components/ui/pagination";
import { Button } from "~/components/ui/button";
import { RefreshCw } from "lucide-react";
import { api } from "~/trpc/react";

export default function VersionsReleasesPage() {
  const PAGE_SIZE = 9;
  const [page, setPage] = React.useState(1);
  const utils = api.useUtils();
  // Local storage helpers for simple, page-scoped cache
  const storageKey = (p: number) => `jrm:releases:list:p${p}:s${PAGE_SIZE}:v1`;
  const readCache = (p: number) => {
    try {
      const raw = localStorage.getItem(storageKey(p));
      if (!raw) return undefined;
      const parsed = JSON.parse(raw) as { total: number; items: ReleaseVersion[] };
      if (
        typeof parsed?.total === "number" &&
        Array.isArray(parsed?.items)
      )
        return parsed;
    } catch {
      // ignore malformed cache
    }
    return undefined;
  };
  const writeCache = (p: number, payload: { total: number; items: ReleaseVersion[] }) => {
    try {
      localStorage.setItem(storageKey(p), JSON.stringify(payload));
    } catch {
      // storage might be unavailable (quota/permissions); fail silently
    }
  };
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  const { data, isFetching } = api.releaseVersion.list.useQuery(
    { page, pageSize: PAGE_SIZE },
    {
      // Cache pages; do not auto-refetch unless manually requested
      staleTime: Infinity,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      // Use client cache only after hydration to avoid SSR/CSR mismatch
      placeholderData: () => (hydrated ? readCache(page) : undefined),
    },
  );
  const items: ReleaseVersion[] = data?.items ?? [];
  const [showPlus, setShowPlus] = React.useState(true);
  const [highlightId, setHighlightId] = React.useState<string | null>(null);

  // Keep page within bounds when items or first-page capacity change
  React.useEffect(() => {
    const PAGE_SIZE = 9;
    const firstPageCapacity = showPlus ? PAGE_SIZE - 1 : PAGE_SIZE;
    const totalPages =
      (data?.total ?? 0) <= firstPageCapacity
        ? 1
        : 1 + Math.ceil(((data?.total ?? 0) - firstPageCapacity) / PAGE_SIZE);
    if (page < 1) setPage(1);
    else if (page > totalPages) setPage(totalPages);
  }, [data?.total, showPlus, page]);
  // Persist latest page data into localStorage whenever it changes
  React.useEffect(() => {
    if (data) writeCache(page, { total: data.total ?? 0, items: data.items ?? [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, data?.total, data?.items]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setPage(1);
            void utils.releaseVersion.list.invalidate({
              page: 1,
              pageSize: PAGE_SIZE,
            });
          }}
          disabled={isFetching}
          aria-label="Reload release versions"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {isFetching ? "Refreshing" : "Refresh"}
        </Button>
        {hydrated && (
          <span role="status" aria-atomic="true" className="sr-only">
            {isFetching ? "Refreshing release versions" : "Release versions up to date"}
          </span>
        )}
      </div>
      {(() => {
        const totalPages = Math.max(
          1,
          Math.ceil((data?.total ?? 0) / PAGE_SIZE),
        );
        const clamped = Math.min(Math.max(1, page), totalPages);
        const isFirstPage = clamped === 1;
        const capacity = isFirstPage && showPlus ? PAGE_SIZE - 1 : PAGE_SIZE;
        const pageItems = isFirstPage ? items.slice(0, capacity) : items;

        return (
          <>
            <div className={[
              "relative grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3",
              isFetching ? "opacity-90" : "",
            ].join(" ")}>
              {isFirstPage && showPlus && (
                <AddReleaseCard
                  onCreated={(it) => {
                    // Insert locally at first position on page 1 without refetch
                    setPage(1);
                    setShowPlus(true);
                    utils.releaseVersion.list.setData(
                      { page: 1, pageSize: PAGE_SIZE },
                      (old) => ({
                        total: (old?.total ?? 0) + 1,
                        items: [it, ...(old?.items ?? [])].slice(0, PAGE_SIZE),
                      }),
                    );
                    setHighlightId(it.id);
                    setTimeout(() => setHighlightId(null), 800);
                  }}
                />
              )}
              {pageItems.map((it, idx) => (
                <ReleaseCard
                  key={it.id}
                  id={it.id}
                  name={it.name}
                  createdAt={it.createdAt}
                  animateOnMount={hydrated && isFirstPage && idx === 0 && !showPlus}
                  variant={it.id === highlightId ? "success" : "default"}
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

            <Pagination
              className="mt-2"
              total={data?.total ?? 0}
              pageSize={PAGE_SIZE}
              page={clamped}
              onPageChange={(p) => setPage(p)}
            />
          </>
        );
      })()}
    </div>
  );
}
