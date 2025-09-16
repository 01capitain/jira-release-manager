"use client";

import * as React from "react";
import { api } from "~/trpc/react";

function colorClasses(base: string) {
  // Map a set of base colors to safe class names for pills.
  // Uses neutral fallback if unknown.
  const map: Record<string, { light: string; dark: string; text: string }> = {
    slate: {
      light: "bg-slate-100",
      dark: "dark:bg-slate-900/40",
      text: "text-slate-900 dark:text-slate-100",
    },
    gray: {
      light: "bg-gray-100",
      dark: "dark:bg-gray-900/40",
      text: "text-gray-900 dark:text-gray-100",
    },
    zinc: {
      light: "bg-zinc-100",
      dark: "dark:bg-zinc-900/40",
      text: "text-zinc-900 dark:text-zinc-100",
    },
    neutral: {
      light: "bg-neutral-100",
      dark: "dark:bg-neutral-900/40",
      text: "text-neutral-900 dark:text-neutral-100",
    },
    stone: {
      light: "bg-stone-100",
      dark: "dark:bg-stone-900/40",
      text: "text-stone-900 dark:text-stone-100",
    },
    red: {
      light: "bg-red-100",
      dark: "dark:bg-red-900/40",
      text: "text-red-900 dark:text-red-100",
    },
    orange: {
      light: "bg-orange-100",
      dark: "dark:bg-orange-900/40",
      text: "text-orange-900 dark:text-orange-100",
    },
    amber: {
      light: "bg-amber-100",
      dark: "dark:bg-amber-900/40",
      text: "text-amber-900 dark:text-amber-100",
    },
    yellow: {
      light: "bg-yellow-100",
      dark: "dark:bg-yellow-900/40",
      text: "text-yellow-900 dark:text-yellow-100",
    },
    lime: {
      light: "bg-lime-100",
      dark: "dark:bg-lime-900/40",
      text: "text-lime-900 dark:text-lime-100",
    },
    green: {
      light: "bg-green-100",
      dark: "dark:bg-green-900/40",
      text: "text-green-900 dark:text-green-100",
    },
    emerald: {
      light: "bg-emerald-100",
      dark: "dark:bg-emerald-900/40",
      text: "text-emerald-900 dark:text-emerald-100",
    },
    teal: {
      light: "bg-teal-100",
      dark: "dark:bg-teal-900/40",
      text: "text-teal-900 dark:text-teal-100",
    },
    cyan: {
      light: "bg-cyan-100",
      dark: "dark:bg-cyan-900/40",
      text: "text-cyan-900 dark:text-cyan-100",
    },
    sky: {
      light: "bg-sky-100",
      dark: "dark:bg-sky-900/40",
      text: "text-sky-900 dark:text-sky-100",
    },
    blue: {
      light: "bg-blue-100",
      dark: "dark:bg-blue-900/40",
      text: "text-blue-900 dark:text-blue-100",
    },
    indigo: {
      light: "bg-indigo-100",
      dark: "dark:bg-indigo-900/40",
      text: "text-indigo-900 dark:text-indigo-100",
    },
    violet: {
      light: "bg-violet-100",
      dark: "dark:bg-violet-900/40",
      text: "text-violet-900 dark:text-violet-100",
    },
    purple: {
      light: "bg-purple-100",
      dark: "dark:bg-purple-900/40",
      text: "text-purple-900 dark:text-purple-100",
    },
    fuchsia: {
      light: "bg-fuchsia-100",
      dark: "dark:bg-fuchsia-900/40",
      text: "text-fuchsia-900 dark:text-fuchsia-100",
    },
    pink: {
      light: "bg-pink-100",
      dark: "dark:bg-pink-900/40",
      text: "text-pink-900 dark:text-pink-100",
    },
    rose: {
      light: "bg-rose-100",
      dark: "dark:bg-rose-900/40",
      text: "text-rose-900 dark:text-rose-100",
    },
  };
  return map[base] ?? map.neutral;
}

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

  if (!data || data.length === 0) return null;
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
