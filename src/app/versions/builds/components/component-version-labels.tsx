"use client";

import * as React from "react";
import { colorClasses } from "~/shared/ui/color-classes";
import type { ReleaseComponentDto } from "~/shared/types/release-component";
import { useReleaseComponentsQuery } from "../../components/api";
import { useComponentVersionsByBuiltQuery } from "../api";

export function ComponentVersionLabels({
  builtVersionId,
}: {
  builtVersionId: string;
}) {
  const { data: releaseComponentsPage } = useReleaseComponentsQuery();
  const comps = React.useMemo<ReleaseComponentDto[]>(
    () => releaseComponentsPage?.items ?? [],
    [releaseComponentsPage],
  );

  // Map componentId -> color
  const colorByComponent = React.useMemo(() => {
    const m = new Map<string, string>();
    comps.forEach((c) => m.set(c.id, c.color));
    return m;
  }, [comps]);

  const { data, isLoading } = useComponentVersionsByBuiltQuery(builtVersionId);
  const versions = data ?? [];

  if (!isLoading && versions.length === 0) {
    return (
      <div
        className="mt-2 text-sm text-amber-700 dark:text-amber-400"
        role="status"
        aria-atomic="true"
      >
        No components for this build yet.
      </div>
    );
  }
  if (isLoading) {
    return (
      <div
        className="text-muted-foreground mt-2 text-sm"
        role="status"
        aria-atomic="true"
      >
        Loading component versions…
      </div>
    );
  }
  return (
    <div className="mt-3">
      <ul
        className="flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0"
        role="list"
      >
        {versions.map((v) => {
          const c = colorClasses(
            colorByComponent.get(v.releaseComponentId) ?? "neutral",
          );
          const cls = [
            "inline-flex items-center whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium",
            c.light,
            c.dark,
            c.text,
          ].join(" ");
          return (
            <li key={v.id} className="leading-none">
              <span className={cls} title={v.name}>
                {v.name}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
