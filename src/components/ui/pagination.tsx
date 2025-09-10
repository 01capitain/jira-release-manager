"use client";

import * as React from "react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

type PaginationProps = {
  total: number;
  pageSize: number;
  page: number; // 1-indexed
  onPageChange: (page: number) => void;
  className?: string;
  siblingCount?: number; // how many pages on each side of current
};

export function Pagination({
  total,
  pageSize,
  page,
  onPageChange,
  className,
  siblingCount = 1,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pages = React.useMemo(() => {
    const result: (number | "ellipsis")[] = [];
    const start = Math.max(2, page - siblingCount);
    const end = Math.min(totalPages - 1, page + siblingCount);
    result.push(1);
    if (start > 2) result.push("ellipsis");
    for (let p = start; p <= end; p++) result.push(p);
    if (end < totalPages - 1) result.push("ellipsis");
    if (totalPages > 1) result.push(totalPages);
    return result;
  }, [page, siblingCount, totalPages]);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-end gap-2", className)}
    >
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={!canPrev}
      >
        Previous
      </Button>
      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span
            key={`e-${i}`}
            className="px-2 text-neutral-500 dark:text-neutral-400"
          >
            …
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? "default" : "secondary"}
            size="sm"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </Button>
        ),
      )}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={!canNext}
      >
        Next
      </Button>
    </nav>
  );
}
