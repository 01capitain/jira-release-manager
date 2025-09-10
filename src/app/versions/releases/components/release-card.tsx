"use client";

import * as React from "react";
import { Card, CardContent } from "~/components/ui/card";
import { useFlip } from "~/components/animation/use-flip";
export default function ReleaseCard({ id, name, createdAt, animateOnMount, variant = "default" }: { id: string; name: string; createdAt?: string; animateOnMount?: boolean; variant?: "default" | "success" }) {
  const [entered, setEntered] = React.useState(!animateOnMount);
  const ref = useFlip(id);

  React.useEffect(() => {
    if (animateOnMount) {
      const rafId = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(rafId);
    }
  }, [animateOnMount]);

  const variantClasses =
    variant === "success"
      ? "border-emerald-400 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500 ring-offset-2 ring-offset-white dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-offset-neutral-900"
      : "";

  return (
    <Card
      ref={ref}
      className={[
        "group relative h-72 overflow-hidden transition-all duration-500 ease-out hover:shadow-md",
        entered ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-2 scale-95",
        variantClasses,
      ].join(" ")}
    >
      <CardContent className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <div className="text-2xl font-semibold tracking-tight">{name}</div>
          {createdAt ? (
            <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              {new Date(createdAt).toLocaleString()}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
