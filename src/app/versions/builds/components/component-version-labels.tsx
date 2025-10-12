"use client";

import * as React from "react";
import { colorClasses } from "~/shared/ui/color-classes";
import { api } from "~/trpc/react";
import { useReleaseComponentsQuery } from "../../components/api";

export function ComponentVersionLabels({
  builtVersionId,
}: {
  builtVersionId: string;
}) {
  const { data: releaseComponentsPage } = useReleaseComponentsQuery();
  const comps = React.useMemo(
    () => releaseComponentsPage?.items ?? [],
    [releaseComponentsPage],
  );

  // Map componentId -> color
  const colorByComponent = React.useMemo(() => {
    const m = new Map<string, string>();
    comps.forEach((c) => m.set(c.id, c.color));
    return m;
  }, [comps]);

  const { data, isLoading } = api.componentVersion.listByBuilt.useQuery({
    builtVersionId,
  });
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
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Component versions">
      {versions.map((v) => {
        const c = colorClasses(
          colorByComponent.get(v.releaseComponentId) ?? "neutral",
        );
        const cls = [
          "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
          c.light,
          c.dark,
          c.text,
        ].join(" ");
        return (
          <span
            key={v.id}
            className={cls}
            title={v.name}
            aria-label={`Component version ${v.name}`}
          >
            {v.name}
          </span>
        );
      })}
    </div>
  );
}
