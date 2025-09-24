"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { colorClasses } from "~/shared/ui/color-classes";

export function ComponentVersionLabels({
  builtVersionId,
}: {
  builtVersionId: string;
}) {
  const { data } = api.componentVersion.listByBuilt.useQuery({
    builtVersionId,
  });
  const { data: comps } = api.releaseComponent.list.useQuery();

  // Map componentId -> color
  const colorByComponent = React.useMemo(() => {
    const m = new Map<string, string>();
    (comps ?? []).forEach((c) => m.set(c.id, c.color));
    return m;
  }, [comps]);

  const { data, isLoading } = api.componentVersion.listByBuilt.useQuery({
    builtVersionId,
  });

  if (!isLoading && (!data || data.length === 0)) {
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
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Component versions">
      {data.map((v) => {
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
