"use client";

import { TRPCClientError } from "@trpc/client";
import { CheckCircle2, Clock3, MinusCircle, UserRound, XCircle } from "lucide-react";
import type { UIEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ScrollArea } from "~/components/ui/scroll-area";
import type { ActionExecutionStatus, ActionHistoryEntryDto } from "~/shared/types/action-history";
import { api } from "~/trpc/react";

const renderStatusIcon = (status: ActionExecutionStatus) => {
  switch (status) {
    case "success":
      return <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-emerald-400" />;
    case "failed":
      return <XCircle aria-hidden="true" className="h-4 w-4 text-red-400" />;
    case "cancelled":
      return <MinusCircle aria-hidden="true" className="h-4 w-4 text-amber-300" />;
  }
  return null;
};

const formatTimestampWithDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  const hh = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${day}.${month}.${year} ${hh}:${minutes}:${ss}`;
};

const formatTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const hh = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  return `${hh}:${minutes}:${ss}.${ms}`;
};

const displayUser = (entry: ActionHistoryEntryDto): string => {
  const info = entry.createdBy;
  if (!info) return "unknown";
  const name = info.name?.trim();
  if (name) return name;
  const email = info.email?.trim();
  if (email) return email;
  return info.id ?? "unknown";
};

function EmptyState({ loading, unauthorized }: { loading: boolean; unauthorized: boolean }) {
  return (
    <div className="flex h-40 items-center justify-center text-xs text-neutral-400 dark:text-neutral-500">
      {unauthorized
        ? "Sign in to record action history."
        : loading
        ? "Loading history…"
        : "No recent actions recorded yet."}
    </div>
  );
}

export function ActionHistoryLog() {
  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    error,
  } = api.actionHistory.current.useInfiniteQuery(
    { limit: 50 },
    {
      getNextPageParam: (lastPage) =>
        lastPage.hasMore ? lastPage.nextCursor ?? undefined : undefined,
      refetchOnWindowFocus: false,
      staleTime: 10_000,
      retry: (failureCount, err) => {
        if (err instanceof TRPCClientError && err.data?.code === "UNAUTHORIZED") {
          return false;
        }
        return failureCount < 2;
      },
    },
  );

  const unauthorized =
    error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED";

  const rawEntries = useMemo(() => {
    if (unauthorized) {
      return [];
    }
    return data?.pages.flatMap((page) => page.items) ?? [];
  }, [data, unauthorized]);

  const entries = useMemo(() => {
    if (rawEntries.length === 0) {
      return [];
    }
    const sorted = [...rawEntries];
    sorted.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    return sorted;
  }, [rawEntries]);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [stickToBottom, setStickToBottom] = useState(true);
  const pendingPrependRef =
    useRef<{ scrollHeight: number; scrollTop: number } | null>(null);

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      const remaining = target.scrollHeight - target.clientHeight - target.scrollTop;
      const nearBottom = remaining <= 32;
      if (nearBottom !== stickToBottom) {
        setStickToBottom(nearBottom);
      }

      if (target.scrollTop <= 32 && hasNextPage && !isFetchingNextPage && !unauthorized) {
        pendingPrependRef.current = {
          scrollHeight: target.scrollHeight,
          scrollTop: target.scrollTop,
        };
        fetchNextPage().catch(() => {
          pendingPrependRef.current = null;
        });
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage, stickToBottom, unauthorized],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    if (pendingPrependRef.current) {
      const { scrollHeight: previousHeight, scrollTop: previousTop } =
        pendingPrependRef.current;
      const heightDelta = viewport.scrollHeight - previousHeight;
      viewport.scrollTop = previousTop + heightDelta;
      pendingPrependRef.current = null;
      return;
    }
    if (stickToBottom) {
      viewport.scrollTop = Math.max(
        viewport.scrollHeight - viewport.clientHeight,
        0,
      );
    }
  }, [entries, stickToBottom]);

  const statusMessage = unauthorized
    ? "Sign in to view"
    : isLoading
    ? "Loading…"
    : null;

  const isBackgroundRefreshing = isFetching && !isLoading && !isFetchingNextPage;

  return (
    <section aria-labelledby="action-history-heading" className="space-y-2">
      <div className="flex items-center justify-between">
        <h2
          id="action-history-heading"
          className="text-sm font-semibold text-neutral-800 dark:text-neutral-100"
        >
          Session Action History
        </h2>
        {statusMessage ? (
          <span
            role="status"
            aria-atomic="true"
            className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
          >
            {statusMessage}
          </span>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-900 text-neutral-100 shadow-inner dark:border-neutral-800 dark:bg-neutral-950">
        <ScrollArea
          className="max-h-80"
          viewportRef={viewportRef}
          onViewportScroll={handleScroll}
        >
          <ol className="divide-y divide-neutral-800/60 font-mono text-xs">
            {entries.length === 0 ? (
              <li>
                <EmptyState loading={isLoading && !unauthorized} unauthorized={unauthorized} />
              </li>
            ) : (
              <>
                {isFetchingNextPage ? (
                  <li className="px-4 py-2 text-center text-xs text-neutral-400">
                    Loading older actions…
                  </li>
                ) : null}
                {entries.map((entry) => (
                  <li key={entry.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 text-neutral-100 sm:flex-nowrap">
                      <span className="flex shrink-0 items-center gap-2 text-neutral-300">
                        <UserRound aria-hidden="true" className="h-4 w-4" />
                        <span className="font-semibold text-neutral-100">
                          {displayUser(entry)}
                        </span>
                        <span aria-hidden="true">:</span>
                      </span>
                      <span className="min-w-0 flex-1 truncate text-neutral-200">
                        {entry.message}
                      </span>
                      <span aria-hidden="true" className="hidden flex-1 items-center sm:flex">
                        <span className="w-full border-t border-dashed border-neutral-700" />
                      </span>
                      <span className="ml-auto flex shrink-0 items-center gap-2 text-xs text-neutral-300">
                        <span className="flex items-center gap-1">
                          {renderStatusIcon(entry.status)}
                          <span className="sr-only">{entry.status}</span>
                        </span>
                        <span className="text-neutral-400">
                          at {formatTimestampWithDate(entry.createdAt)}
                        </span>
                        <Clock3 aria-hidden="true" className="h-4 w-4 text-neutral-500" />
                      </span>
                    </div>
                    {entry.subactions.length > 0 ? (
                      <div className="mt-3 space-y-2 pl-8">
                        {entry.subactions.map((sub) => (
                          <div
                            key={sub.id}
                            className="flex flex-wrap items-center gap-2 text-neutral-300 sm:flex-nowrap"
                          >
                            <span className="flex shrink-0 items-center gap-2 text-neutral-500">
                              <span aria-hidden="true">↳</span>
                              <span className="text-neutral-300">{sub.message}</span>
                            </span>
                            <span aria-hidden="true" className="hidden flex-1 items-center sm:flex">
                              <span className="w-full border-t border-dashed border-neutral-800" />
                            </span>
                            <span className="ml-auto flex shrink-0 items-center gap-2 text-xs text-neutral-400">
                              <span className="flex items-center gap-1">
                                {renderStatusIcon(sub.status)}
                                <span className="sr-only">{sub.status}</span>
                              </span>
                              <span>{formatTime(sub.createdAt)}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </>
            )}
          </ol>
        </ScrollArea>
      </div>

      {isBackgroundRefreshing && !unauthorized ? (
        <span
          role="status"
          aria-atomic="true"
          className="text-xs text-neutral-500 dark:text-neutral-400"
        >
          Refreshing…
        </span>
      ) : null}
    </section>
  );
}
