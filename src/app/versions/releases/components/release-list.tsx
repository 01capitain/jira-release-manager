"use client";

import * as React from "react";
import { Card, CardContent } from "~/components/ui/card";
import { getReleaseVersions, type ReleaseVersion } from "./release-storage";

export default function ReleaseList({
  items: initial,
}: {
  items?: ReleaseVersion[];
}) {
  const [items, setItems] = React.useState<ReleaseVersion[]>(initial ?? []);

  React.useEffect(() => {
    // Hydrate: prefer initial when provided; otherwise fall back to localStorage.
    if (initial && initial.length > 0) {
      setItems(initial);
    } else {
      setItems(getReleaseVersions());
    }
  }, [initial]);

  if (items.length === 0) {
    return (
      <Card className="h-56">
        <CardContent className="flex h-full items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
          No release versions yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-4">
            <div className="flex items-baseline justify-between">
              <div className="text-base font-medium">{r.name}</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                <time dateTime={r.createdAt}>
                  {isNaN(new Date(r.createdAt).getTime())
                    ? "—"
                    : new Date(r.createdAt).toLocaleString()}
                </time>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
