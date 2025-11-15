"use client";

import * as React from "react";
import { cn } from "~/lib/utils";
import colorClasses from "~/shared/ui/color-classes";

import type { ReleaseCalendarEventComponent } from "~/shared/types/release-calendar";

type BuiltVersionCalendarEventProps = {
  name: string;
  statusLabel?: string;
  components?: ReleaseCalendarEventComponent[];
};

function BuiltVersionCalendarEvent({
  name,
  statusLabel,
  components = [],
}: BuiltVersionCalendarEventProps) {
  const palette = colorClasses("neutral");

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-md border border-neutral-200 px-2 py-1 text-xs dark:border-neutral-800",
        palette.light,
        palette.dark,
        "shadow-sm",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("truncate font-semibold", palette.text)}>
          {name}
        </span>
        {statusLabel ? (
          <span className="rounded-full bg-neutral-900/10 px-2 py-0.5 text-[10px] tracking-wide text-neutral-700 uppercase dark:bg-neutral-100/10 dark:text-neutral-200">
            {statusLabel}
          </span>
        ) : null}
      </div>
      {components.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {components.map((component, index) => {
            const baseColor = component.color ?? "sky";
            const componentPalette = colorClasses(baseColor);
            return (
              <span
                key={`${component.name}-${index}`}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                  componentPalette.light,
                  componentPalette.dark,
                  componentPalette.text,
                )}
              >
                {component.name}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default React.memo(BuiltVersionCalendarEvent);
