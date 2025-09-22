"use client";

import * as React from "react";
import { useSession, signIn } from "next-auth/react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";

export default function JiraReleasesPage() {
  const [includeReleased, setIncludeReleased] = React.useState(true);
  const [includeUnreleased, setIncludeUnreleased] = React.useState(true);
  const [includeArchived, setIncludeArchived] = React.useState(false);

  const { data: session } = useSession();
  const query = api.jira.fetchVersions.useQuery(
    {
      includeReleased,
      includeUnreleased,
      includeArchived,
      pageSize: 50,
    },
    { refetchOnWindowFocus: false, enabled: !!session },
  );

  const releases = api.releaseVersion.list.useQuery({ page: 1, pageSize: 100 });

  const isConfigured = query.data?.configured ?? false;
  const items = query.data?.items ?? [];

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
        <div className="mt-3 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeUnreleased}
              onChange={(e) => setIncludeUnreleased(e.target.checked)}
            />
            Unreleased
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeReleased}
              onChange={(e) => setIncludeReleased(e.target.checked)}
            />
            Released
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
            Archived
          </label>
          <Button
            onClick={() => void query.refetch()}
            disabled={query.isRefetching || query.isLoading}
            aria-label="Sync releases from Jira"
            title="Sync releases from Jira"
          >
            {query.isLoading || query.isRefetching ? "Syncing…" : "Sync releases from Jira"}
          </Button>
        </div>

        {!isConfigured ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">
            Jira connection incomplete: set environment (base URL, project key) and user credentials.
          </p>
        ) : null}

        {query.error ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">
            {query.error.message}
          </p>
        ) : null}

        <div className="mt-6">
          <h3 className="text-base font-medium">Fetched Jira versions ({items.length})</h3>
          {query.isLoading ? (
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Loading…</p>
          ) : items.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              No versions found for current filters.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-neutral-200 dark:divide-neutral-800">
              {items.map((v) => (
                <li key={`${v.id}:${v.name}`} className="py-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-medium">
                        {v.name}
                        <span className="ml-2 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                          {v.released ? "Released" : v.archived ? "Archived" : "Unreleased"}
                        </span>
                      </div>
                      {v.releaseDate ? (
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          Release date: {v.releaseDate}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`map-${v.id}`} className="text-xs">Map to internal</Label>
                      <select
                        id={`map-${v.id}`}
                        className="h-9 min-w-52 rounded-md border border-neutral-300 bg-transparent px-3 text-sm dark:border-neutral-700"
                        defaultValue=""
                        aria-label={`Map Jira version ${v.name} to internal release`}
                      >
                        <option value="" disabled>
                          Select release…
                        </option>
                        {(releases.data?.items ?? []).map((r) => (
                          // @ts-expect-error list returns items: ReleaseVersionDto[]
                          <option key={r.id} value={r.id}>
                            {/* @ts-expect-error dto has name */}
                            {r.name}
                          </option>
                        ))}
                      </select>
                      <Button variant="secondary" disabled title="Save mapping (coming soon)">
                        Save
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
