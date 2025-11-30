"use client";

import * as React from "react";
import { Check } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import type { ReleaseTrack } from "~/shared/types/release-track";
import { RELEASE_TRACK_VALUES } from "~/shared/types/release-track";

const TRACK_STYLE_MAP: Record<
  ReleaseTrack,
  { swatch: string; border: string; optionDot: string; optionHover: string }
> = {
  Future: {
    swatch: "bg-purple-400/80 dark:bg-purple-500/70",
    border: "border-purple-400/80 dark:border-purple-400/60",
    optionDot: "bg-purple-400",
    optionHover: "hover:bg-purple-50/80 dark:hover:bg-purple-900/40",
  },
  Beta: {
    swatch: "bg-sky-400/80 dark:bg-sky-500/70",
    border: "border-sky-400/70 dark:border-sky-400/60",
    optionDot: "bg-sky-400",
    optionHover: "hover:bg-sky-50/80 dark:hover:bg-sky-900/40",
  },
  Rollout: {
    swatch: "bg-yellow-300/90 dark:bg-yellow-400/70",
    border: "border-yellow-400/70 dark:border-yellow-400/60",
    optionDot: "bg-yellow-300",
    optionHover: "hover:bg-yellow-50/80 dark:hover:bg-yellow-900/40",
  },
  Active: {
    swatch: "bg-emerald-400/80 dark:bg-emerald-500/70",
    border: "border-emerald-400/70 dark:border-emerald-400/60",
    optionDot: "bg-emerald-400",
    optionHover: "hover:bg-emerald-50/80 dark:hover:bg-emerald-900/40",
  },
  Archived: {
    swatch: "bg-neutral-400/70 dark:bg-neutral-500/70",
    border: "border-neutral-400/70 dark:border-neutral-400/60",
    optionDot: "bg-neutral-400",
    optionHover: "hover:bg-neutral-100/80 dark:hover:bg-neutral-800/60",
  },
};

type ReleaseTrackPickerStatus = { pending?: boolean; error?: string | null };

type ReleaseTrackPickerProps = {
  value: ReleaseTrack;
  onSelect: (track: ReleaseTrack) => void;
  disabled?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status?: ReleaseTrackPickerStatus;
  triggerLabel: string;
};

export const ReleaseTrackPicker = ({
  value,
  onSelect,
  disabled,
  open,
  onOpenChange,
  status,
  triggerLabel,
}: ReleaseTrackPickerProps) => {
  const styles = TRACK_STYLE_MAP[value] ?? TRACK_STYLE_MAP.Future;

  const handleTriggerClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onOpenChange(!open);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={triggerLabel}
          onClick={handleTriggerClick}
          className={`mr-3 flex w-6 flex-shrink-0 items-stretch self-stretch overflow-hidden rounded-l-md border-y ${styles.border} min-h-[2.75rem] bg-white/40 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:bg-neutral-900 dark:ring-offset-neutral-900`}
        >
          <span className={`flex-1 rounded-l-md ${styles.swatch}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-52 space-y-2 p-3 text-sm"
      >
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-300">
          Select release track
        </p>
        <div className="space-y-1">
          {RELEASE_TRACK_VALUES.map((track) => {
            const optionStyles = TRACK_STYLE_MAP[track];
            const isSelected = track === value;
            return (
              <button
                key={track}
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onSelect(track);
                  onOpenChange(false);
                }}
                disabled={disabled}
                aria-pressed={isSelected}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left transition ${optionStyles.optionHover} ${
                  isSelected
                    ? "ring-2 ring-offset-1 ring-offset-white dark:ring-offset-neutral-900"
                    : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`h-3 w-3 rounded-full ${optionStyles.optionDot}`}
                  />
                  {track}
                </span>
                {isSelected ? (
                  <Check
                    className="h-4 w-4 text-neutral-600 dark:text-neutral-300"
                    aria-hidden="true"
                  />
                ) : (
                  <span className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
        {status?.pending ? (
          <output
            aria-atomic="true"
            className="text-xs text-neutral-500 dark:text-neutral-400"
          >
            Updating…
          </output>
        ) : null}
        {status?.error ? (
          <output
            aria-atomic="true"
            className="block text-xs text-red-600 dark:text-red-400"
          >
            {status.error}
          </output>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};
