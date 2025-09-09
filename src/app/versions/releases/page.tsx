"use client";

import * as React from "react";
import AddReleaseCard from "./components/add-release-card";
import ReleaseCard from "./components/release-card";
import { type ReleaseVersion, getReleaseVersions } from "./components/release-storage";

export default function VersionsReleasesPage() {
  const [items, setItems] = React.useState<ReleaseVersion[]>([]);
  const [showPlus, setShowPlus] = React.useState(true);
  const [highlightId, setHighlightId] = React.useState<string | null>(null);
  React.useEffect(() => setItems(getReleaseVersions()), []);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {showPlus && (
          <AddReleaseCard
            onCreated={(it) => {
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
        {items.map((it, idx) => (
          <ReleaseCard
            key={it.id}
            id={it.id}
            name={it.name}
            createdAt={it.createdAt}
            animateOnMount={idx === 0}
            variant={it.id === highlightId ? "success" : "default"}
          />
        ))}
      </div>
    </div>
  );
}
