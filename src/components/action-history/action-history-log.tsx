"use client";

import { TRPCClientError } from "@trpc/client";
import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";

import { ScrollArea } from "~/components/ui/scroll-area";
import type { ActionExecutionStatus, ActionHistoryEntryDto } from "~/shared/types/action-history";
import { api } from "~/trpc/react";

const renderStatusIcon = (status: ActionExecutionStatus) => {
  switch (status) {
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-400" aria-hidden="true" />;
    case "cancelled":
      return <MinusCircle className="h-4 w-4 text-amber-300" aria-hidden="true" />;
  }
};

const formatTimestamp = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  const microsRaw = String(date.getMilliseconds() * 1000).padStart(6, "0");
  const micros = microsRaw.endsWith("000") ? microsRaw.slice(0, -3) : microsRaw;
  const fraction = micros.length > 0 ? `.${micros}` : "";
  return `${hh}:${mm}:${ss}${fraction}`;
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
  const { data, isLoading, isFetching, error } = api.actionHistory.current.useQuery(
    undefined,
    {
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

  const unauthorized = error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED";
  const entries = unauthorized ? [] : data ?? [];

  return (
    <section aria-labelledby="action-history-heading" className="space-y-2">
      <div className="flex items-center justify-between">
        <h2
          id="action-history-heading"
          className="text-sm font-semibold text-neutral-800 dark:text-neutral-100"
        >
          Session Action History
        </h2>
        <span
          role="status"
          aria-atomic="true"
          className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
        >
          {unauthorized
            ? "Sign in to view"
            : isLoading
            ? "Loading…"
            : `${entries.length} entr${entries.length === 1 ? "y" : "ies"}`}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-900 text-neutral-100 shadow-inner dark:border-neutral-800 dark:bg-neutral-950">
        <ScrollArea className="max-h-80">
          <ol className="divide-y divide-neutral-800/60 font-mono text-xs">
            {entries.length === 0 ? (
              <li>
                <EmptyState loading={isLoading && !unauthorized} unauthorized={unauthorized} />
              </li>
            ) : (
              entries.map((entry) => (
                <li key={entry.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-neutral-100">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      [{formatTimestamp(entry.createdAt)}]
                    </span>
                    {renderStatusIcon(entry.status)}
                    <span className="truncate">
                      {entry.message}
                    </span>
                    <span className="text-neutral-400 dark:text-neutral-500">
                      — {displayUser(entry)}
                    </span>
                  </div>
                  {entry.subactions.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      {entry.subactions.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-6 text-neutral-300"
                        >
                          <span className="text-neutral-500">↳</span>
                          <span className="text-neutral-500 dark:text-neutral-400">
                            [{formatTimestamp(sub.createdAt)}]
                          </span>
                          <span className="flex items-center gap-1">
                            {renderStatusIcon(sub.status)}
                          </span>
                          <span className="truncate text-neutral-200">
                            {sub.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))
            )}
          </ol>
        </ScrollArea>
      </div>

      {isFetching && !isLoading && !unauthorized ? (
        <span role="status" aria-atomic="true" className="text-xs text-neutral-500 dark:text-neutral-400">
          Refreshing…
        </span>
      ) : null}
    </section>
  );
}
