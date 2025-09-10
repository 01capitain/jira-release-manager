"use client";

import * as React from "react";
import AddReleaseCard from "./components/add-release-card";
import ReleaseCard from "./components/release-card";
import { type ReleaseVersion, getReleaseVersions } from "./components/release-storage";
import { Pagination } from "~/components/ui/pagination";

export default function VersionsReleasesPage() {
  const [items, setItems] = React.useState<ReleaseVersion[]>([]);
  const [showPlus, setShowPlus] = React.useState(true);
  const [highlightId, setHighlightId] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  React.useEffect(() => setItems(getReleaseVersions()), []);

  // Keep page within bounds when items or first-page capacity change
  React.useEffect(() => {
    const PAGE_SIZE = 9;
    const firstPageCapacity = showPlus ? PAGE_SIZE - 1 : PAGE_SIZE;
    const totalPages =
      items.length <= firstPageCapacity
        ? 1
        : 1 + Math.ceil((items.length - firstPageCapacity) / PAGE_SIZE);
    if (page < 1) setPage(1);
    else if (page > totalPages) setPage(totalPages);
  }, [items.length, showPlus, page]);
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {(() => {
        const PAGE_SIZE = 9;
        const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
        const clamped = Math.min(Math.max(1, page), totalPages);
        const startIndex = (clamped - 1) * PAGE_SIZE;
        const isFirstPage = clamped === 1;
        const capacity = isFirstPage && showPlus ? PAGE_SIZE - 1 : PAGE_SIZE;
        const pageItems = isFirstPage
          ? items.slice(0, capacity)
          : items.slice(startIndex, startIndex + PAGE_SIZE);

        return (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
              {isFirstPage && showPlus && (
                <AddReleaseCard
                  onCreated={(it) => {
                      setPage(1);
                      // First render: hide plus and place the new item at index 0 so we can measure its rect
                      setShowPlus(false);
                      setItems((prev) => [it, ...prev]);
                      setHighlightId(it.id);
                      // Next tick: show the plus again which shifts the card to the right; FLIP hook animates the move
                      setTimeout(() => setShowPlus(true), 50);
                      // Remove highlight after the motion completes
                      setTimeout(() => setHighlightId(null), 800);
                    }}
                  />
                )}
                {pageItems.map((it, idx) => (
                  <ReleaseCard
                    key={it.id}
                    id={it.id}
                    name={it.name}
                    createdAt={it.createdAt}
                    animateOnMount={isFirstPage && idx === 0 && !showPlus}
                    variant={it.id === highlightId ? "success" : "default"}
                  />
                ))}
            </div>

            <Pagination
              className="mt-2"
              total={items.length}
              pageSize={PAGE_SIZE}
              page={clamped}
              onPageChange={(p) => setPage(p)}
            />
          </>
        );
      })()}
    </div>
  );
}
