"use client";

import * as React from "react";
import { cn } from "~/lib/utils";

type GlowingEffectProps = React.HTMLAttributes<HTMLDivElement> & {
  active?: boolean;
  color?: string; // tailwind color class hints
  thickness?: "thin" | "thick";
  children: React.ReactNode;
};

export function GlowingEffect({
  active = false,
  color = "emerald",
  thickness = "thin",
  className,
  children,
  ...props
}: GlowingEffectProps) {
  // Renders a subtle animated glow around the children using layered gradients.
  const ring = thickness === "thick" ? "ring-2" : "ring-1";
  const ringColor =
    color === "emerald"
      ? "ring-emerald-400/60 dark:ring-emerald-500/50"
      : "ring-green-400/60 dark:ring-green-500/50";

  return (
    <div className={cn("relative", className)} {...props}>
      <div
        className={cn(
          "relative rounded-xl",
          active ? `${ring} ${ringColor} ring-offset-2 ring-offset-white dark:ring-offset-neutral-900` : undefined,
        )}
      >
        {children}
        {active && (
          <div
            className={cn(
              "pointer-events-none absolute -inset-6 rounded-2xl blur-2xl",
              "bg-[radial-gradient(closest-side,rgba(5,150,105,0.35),transparent_80%)]",
              "animate-pulse",
            )}
          />
        )}
      </div>
    </div>
  );
}
