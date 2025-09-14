"use client";

import * as React from "react";
import { Card, CardContent } from "~/components/ui/card";

export default function BuiltVersionCard({
  name,
  createdAt,
}: {
  name: string;
  createdAt?: string;
}) {
  const [entered, setEntered] = React.useState(false);
  React.useEffect(() => {
    const rafId = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <Card
      className={[
        "group relative h-72 overflow-hidden hover:shadow-md",
        "transition-all duration-500 ease-out motion-reduce:transition-none",
        entered
          ? "translate-y-0 scale-100 opacity-100 motion-reduce:transform-none motion-reduce:opacity-100"
          : "-translate-y-2 scale-95 opacity-0 motion-reduce:transform-none motion-reduce:opacity-100",
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
                const local = d.toLocaleString();
                return <time dateTime={d.toISOString()} title={local}>{local}</time>;
              })()}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

