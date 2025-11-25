"use client";

import * as React from "react";
import { colorClasses } from "~/shared/ui/color-classes";
import type { ReleaseComponentDto } from "~/shared/types/release-component";
import type { ComponentVersionDto } from "~/shared/types/component-version";
import { useReleaseComponentsQuery } from "../../components/api";

type ComponentVersionLabelsProps = {
  versions: ComponentVersionDto[];
  isLoading?: boolean;
  error?: string;
};

export function ComponentVersionLabels({
  versions,
  isLoading,
  error,
}: ComponentVersionLabelsProps) {
  const { data: releaseComponentsPage } = useReleaseComponentsQuery();
  const comps = React.useMemo<ReleaseComponentDto[]>(
    () => releaseComponentsPage?.items ?? [],
    [releaseComponentsPage],
  );

  const colorByComponent = React.useMemo(() => {
    const m = new Map<string, string>();
    comps.forEach((c) => m.set(c.id, c.color));
    return m;
  }, [comps]);

  if (error) {
    return (
      <div
        className="mt-2 text-sm text-red-600 dark:text-red-400"
        role="status"
        aria-atomic="true"
      >
        {error}
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
  if (versions.length === 0) {
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

  return (
    <div className="mt-3">
      <ul className="flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0">
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
