"use client";

import * as React from "react";
import { cn } from "~/lib/utils";

type GlowingEffectProps = React.HTMLAttributes<HTMLDivElement> & {
  active?: boolean;
  color?: "emerald" | "green" | "neutral";
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
    color === "neutral"
      ? "ring-neutral-300/60 dark:ring-neutral-700/50"
      : color === "emerald"
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
              color === "neutral"
                ? "bg-[radial-gradient(closest-side,rgba(115,115,115,0.28),transparent_80%)]"
                : "bg-[radial-gradient(closest-side,rgba(5,150,105,0.35),transparent_80%)]",
              "animate-pulse",
            )}
          />
        )}
      </div>
    </div>
  );
}
