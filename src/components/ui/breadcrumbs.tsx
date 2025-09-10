"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "~/lib/utils";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  if (!items || items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm text-neutral-500 dark:text-neutral-400", className)}>
      <ol className="flex items-center gap-2">
        {items.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex items-center gap-2">
            {c.href ? (
              <Link href={c.href} className="hover:text-neutral-900 dark:hover:text-neutral-100">
                {c.label}
              </Link>
            ) : (
              <span
                className="text-neutral-900 dark:text-neutral-100"
                aria-current="page"
              >
                {c.label}
              </span>
            )}
            {i < items.length - 1 ? (
              <span className="text-neutral-400" aria-hidden="true">
                /
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

