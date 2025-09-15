"use client";

import * as React from "react";
import { Card, CardContent } from "~/components/ui/card";
import { useFlip } from "~/components/animation/use-flip";
export default function ReleaseCard({
  id,
  name,
  createdAt,
  animateOnMount,
  variant = "default",
}: {
  id: string;
  name: string;
  createdAt?: string;
  animateOnMount?: boolean;
  variant?: "default" | "success";
}) {
  const [entered, setEntered] = React.useState(!animateOnMount);
  const [hydrated, setHydrated] = React.useState(false);
  const ref = useFlip(id);

  React.useEffect(() => {
    if (animateOnMount) {
      const rafId = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(rafId);
    }
  }, [animateOnMount]);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  const variantClasses =
    variant === "success"
      ? "border-emerald-400 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500 ring-offset-2 ring-offset-white dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-offset-neutral-900"
      : "";

  return (
    <Card
      ref={ref}
      className={[
        "group relative h-72 overflow-hidden transition-all duration-500 ease-out hover:shadow-md",
        entered
          ? "translate-y-0 scale-100 opacity-100"
          : "-translate-y-2 scale-95 opacity-0",
        variantClasses,
      ].join(" ")}
    >
      <CardContent className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <div className="text-2xl font-semibold tracking-tight">{name}</div>
          {createdAt ? (
            <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              {(() => {
                const d = new Date(createdAt);
                if (Number.isNaN(d.getTime())) return createdAt;
                const iso = d.toISOString();
                const txt = hydrated ? d.toLocaleString() : iso;
                return (
                  <time dateTime={iso} suppressHydrationWarning>
                    {txt}
                  </time>
                );
              })()}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
