"use client";

import * as React from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { api, type RouterOutputs } from "~/trpc/react";
import { Pagination } from "~/components/ui/pagination";

type StoredVersionsResponse = RouterOutputs["jira"]["listStoredVersions"];
type StoredVersion = StoredVersionsResponse["items"][number];
type ReleaseVersionsResponse = RouterOutputs["releaseVersion"]["list"];
type ReleaseVersionItem = ReleaseVersionsResponse["items"][number];

const formatReleaseDate = (
  value: StoredVersion["releaseDate"] | string,
): string | null => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string" && value.length > 0) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? null
      : parsed.toISOString().slice(0, 10);
  }
  return null;
};

export default function JiraReleasesPage() {
  const [includeReleased, setIncludeReleased] = React.useState(true);
  const [includeUnreleased, setIncludeUnreleased] = React.useState(true);
  const [includeArchived, setIncludeArchived] = React.useState(false);

  const { data: session } = useSession();
  // No auto-sync query; syncing happens only on explicit action

  const releases = api.releaseVersion.list.useQuery({ page: 1, pageSize: 100 });
  const canSyncQuick = api.jira.canSyncQuick.useQuery(undefined, {
    enabled: !!session,
  });
  const [page, setPage] = React.useState(1);
  const pageSize = 50;
  const listStored = api.jira.listStoredVersions.useQuery({
    page,
    pageSize,
    includeReleased,
    includeUnreleased,
    includeArchived,
  });
  const sync = api.jira.syncVersions.useMutation({
    onSuccess: async () => {
      await listStored.refetch();
    },
  });

  const storedData = listStored.data;
  const storedItems: StoredVersion[] = storedData?.items
    ? [...storedData.items]
    : [];
  const releaseItems: ReleaseVersionItem[] = releases.data?.items
    ? [...releases.data.items]
    : [];
  const hasStoredItems = storedItems.length > 0;

  // No connection check here beyond presence; handled by canSyncQuick query

  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="text-2xl font-semibold tracking-tight">Jira releases</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Fetch project versions from Jira and map them to internal releases.
      </p>
      {!session ? (
        <div className="mt-4 rounded-md border border-neutral-300 bg-neutral-50 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-900">
          Please sign in to fetch Jira releases.
          <div className="mt-2">
            <Button onClick={() => void signIn("discord")}>Sign in</Button>
          </div>
        </div>
      ) : null}

      <section className="mt-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-lg font-medium">Sync Releases</h2>
        {!session ? (
          <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Please sign in to manage Jira releases.
          </div>
        ) : null}
        {session && canSyncQuick.data && canSyncQuick.data.ok === false ? (
          <div className="mt-3 text-sm">
            <p className="text-red-600 dark:text-red-400">
              Jira connection incomplete:{" "}
              {canSyncQuick.data.reason ?? "Unknown reason"}
            </p>
            <p className="mt-1">
              Go to{" "}
              <Link className="underline" href="/jira-settings/connect">
                Jira connect
              </Link>{" "}
              to configure connection before syncing.
            </p>
          </div>
        ) : null}
        {!session ||
        canSyncQuick.isLoading ||
        !canSyncQuick.data ? null : canSyncQuick.data.ok ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <fieldset className="inline-flex overflow-hidden rounded-md border border-neutral-300 dark:border-neutral-700">
              <legend className="sr-only">Filter statuses</legend>
              <Button
                variant="outline"
                onClick={() => setIncludeUnreleased((v) => !v)}
                aria-pressed={includeUnreleased}
                className={
                  "rounded-none " +
                  (includeUnreleased
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "")
                }
              >
                Unreleased
              </Button>
              <Button
                variant="outline"
                onClick={() => setIncludeReleased((v) => !v)}
                aria-pressed={includeReleased}
                className={
                  "rounded-none " +
                  (includeReleased
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "")
                }
              >
                Released
              </Button>
              <Button
                variant="outline"
                onClick={() => setIncludeArchived((v) => !v)}
                aria-pressed={includeArchived}
                className={
                  "rounded-none " +
                  (includeArchived
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "")
                }
              >
                Archived
              </Button>
            </fieldset>
            <Button
              onClick={() =>
                void sync.mutateAsync({
                  includeArchived,
                  includeReleased,
                  includeUnreleased,
                  pageSize,
                })
              }
              disabled={!session || sync.isPending}
              aria-label="Sync releases from Jira"
              title="Sync releases from Jira"
            >
              {sync.isPending ? "Syncing…" : "Sync releases from Jira"}
            </Button>
          </div>
        ) : null}
      </section>

      <section className="mt-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-lg font-medium">Stored Jira versions</h2>
        {listStored.isLoading ? (
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Loading…
          </p>
        ) : !hasStoredItems ? (
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            No versions loaded. Click “Sync releases from Jira” to fetch.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-200 dark:divide-neutral-800">
            {storedItems.map((v) => {
              const formattedReleaseDate = formatReleaseDate(v.releaseDate);
              const statusLabel =
                v.releaseStatus === "Released"
                  ? "Released"
                  : v.releaseStatus === "Archived"
                    ? "Archived"
                    : "Unreleased";
              return (
                <li key={`${v.id}:${v.name}`} className="py-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-medium">
                        {v.name}
                        <span className="ml-2 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                          {statusLabel}
                        </span>
                      </div>
                      {formattedReleaseDate ? (
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          Release date: {formattedReleaseDate}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`map-${v.id}`} className="text-xs">
                        Map to internal
                      </Label>
                      <select
                        id={`map-${v.id}`}
                        className="h-9 min-w-52 rounded-md border border-neutral-300 bg-transparent px-3 text-sm dark:border-neutral-700"
                        defaultValue=""
                        aria-label={`Map Jira version ${v.name} to internal release`}
                      >
                        <option value="" disabled>
                          Select release…
                        </option>
                        {releaseItems.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="secondary"
                        disabled
                        title="Save mapping (coming soon)"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {storedData && storedData.total > pageSize ? (
          <div className="mt-3">
            <Pagination
              total={storedData.total}
              pageSize={pageSize}
              page={page}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
