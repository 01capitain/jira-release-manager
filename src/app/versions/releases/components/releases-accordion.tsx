"use client";

import {
  Calendar as CalendarIcon,
  ChevronDown,
  List as ListIcon,
  Check,
  Pencil,
  X as XIcon,
} from "lucide-react";
import * as React from "react";
import type { ReleaseVersionWithPatchesDto } from "~/shared/types/release-version-with-patches";
import type { PatchStatusResponse } from "~/shared/types/patch-status-response";
import type { ReleaseTrack } from "~/shared/types/release-track";
import { RELEASE_TRACK_VALUES } from "~/shared/types/release-track";
import PatchCard from "../../builds/components/patch-card";
import {
  useReleaseEntities,
  useUpdateReleaseMutation,
  useUpdateReleaseTrackMutation,
} from "../api";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Input } from "~/components/ui/input";
import ReleaseCalendar from "./release-calendar";
import { mapPatchesToCalendarEvents } from "../lib/calendar-events";
import { isRestApiError } from "~/lib/rest-client";
import { ReleaseVersionUpdateSchema } from "~/shared/schemas/release-version";

function LatestActiveTag({
  patchIds,
  patchNames,
  statusSnapshots,
}: {
  patchIds: string[];
  patchNames: string[];
  statusSnapshots: Record<string, PatchStatusResponse | undefined>;
}) {
  const activeIdx = React.useMemo(() => {
    return patchIds.findIndex((id) => statusSnapshots[id]?.status === "active");
  }, [patchIds, statusSnapshots]);

  if (activeIdx < 0) return null;
  const name = patchNames[activeIdx]!;
  return (
    <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-200">
      Active: {name}
    </span>
  );
}

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

const ReleaseNameEditor = ({
  releaseId,
  name,
}: {
  releaseId: string;
  name: string;
}) => {
  const mutation = useUpdateReleaseMutation();
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(name);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setValue(name);
    setError(null);
    setEditing(false);
  }, [name]);

  const onSave = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setError(null);
    const parsed = ReleaseVersionUpdateSchema.safeParse({ name: value });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid name");
      return;
    }
    try {
      await mutation.mutateAsync({ releaseId, name: parsed.data.name });
      setEditing(false);
    } catch (err) {
      setError(
        isRestApiError(err)
          ? err.message
          : "Failed to rename release. Please try again.",
      );
    }
  };

  if (!editing) {
    return (
      <div className="group flex items-center gap-2">
        <span className="text-base font-medium">Release {name}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Rename release ${name}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setEditing(true);
          }}
          className="text-neutral-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          aria-label="Release name"
          className="w-48"
          disabled={mutation.isPending}
        />
        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={mutation.isPending}
        >
          Save
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Cancel rename"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setEditing(false);
            setValue(name);
            setError(null);
          }}
          disabled={mutation.isPending}
        >
          <XIcon className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      {mutation.isPending ? (
        <output
          aria-atomic="true"
          className="text-xs text-neutral-500 dark:text-neutral-400"
        >
          Saving…
        </output>
      ) : null}
      {error ? (
        <output
          aria-atomic="true"
          className="text-xs text-red-600 dark:text-red-400"
        >
          {error}
        </output>
      ) : null}
    </div>
  );
};

const ReleaseTrackSelector = ({
  releaseId,
  currentTrack,
}: {
  releaseId: string;
  currentTrack: ReleaseTrack;
}) => {
  const mutation = useUpdateReleaseTrackMutation();
  const [selectedTrack, setSelectedTrack] =
    React.useState<ReleaseTrack>(currentTrack);
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSelectedTrack(currentTrack);
    setError(null);
    setOpen(false);
  }, [currentTrack]);
  const handleSelect = async (nextTrack: ReleaseTrack) => {
    if (nextTrack === selectedTrack) {
      setOpen(false);
      return;
    }
    const previousTrack = selectedTrack;
    setSelectedTrack(nextTrack);
    setError(null);
    try {
      await mutation.mutateAsync({
        releaseId,
        releaseTrack: nextTrack,
      });
      setOpen(false);
    } catch (err) {
      setSelectedTrack(previousTrack);
      setError(
        isRestApiError(err)
          ? err.message
          : "Failed to update release track. Please try again.",
      );
    }
  };

  const styles = TRACK_STYLE_MAP[selectedTrack] ?? TRACK_STYLE_MAP.Future;

  const handleTriggerClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen((prev) => !prev);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Release track: ${selectedTrack}. Click to change.`}
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
            const isSelected = track === selectedTrack;
            return (
              <button
                key={track}
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleSelect(track);
                }}
                disabled={mutation.isPending}
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
        {mutation.isPending ? (
          <output
            aria-atomic="true"
            className="text-xs text-neutral-500 dark:text-neutral-400"
          >
            Updating…
          </output>
        ) : null}
        {error ? (
          <output
            aria-atomic="true"
            className="block text-xs text-red-600 dark:text-red-400"
          >
            {error}
          </output>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};

type ReleasesAccordionProps = {
  releaseComponentLookup: Record<string, { color?: string }>;
};

export default function ReleasesAccordion({
  releaseComponentLookup,
}: ReleasesAccordionProps) {
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => setHydrated(true), []);
  const [viewModeByRelease, setViewModeByRelease] = React.useState<
    Record<string, "list" | "calendar">
  >({});

  const { releases, isFetching, patchStatusById, componentStateByPatchId } =
    useReleaseEntities({ enabled: true });

  const normalizedReleases: ReleaseVersionWithPatchesDto[] = releases ?? [];

  return (
    <div className="space-y-5">
      {normalizedReleases.map((rel) => {
        const ids = rel.patches.map((b) => b.id);
        const names = rel.patches.map((b) => b.name);
        const mode = viewModeByRelease[rel.id] ?? "list";
        const calendarEvents = mapPatchesToCalendarEvents(
          rel,
          [],
          releaseComponentLookup,
        );
        return (
          <details
            key={rel.id}
            className="group rounded-md border border-neutral-200 dark:border-neutral-800"
          >
            <summary className="flex cursor-pointer list-none items-stretch gap-3 rounded-md bg-neutral-50 pr-4 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
              <ReleaseTrackSelector
                releaseId={rel.id}
                currentTrack={rel.releaseTrack}
              />
              <div className="flex flex-1 flex-wrap items-center justify-between gap-3 py-2 pr-4 pl-1">
                <div className="flex flex-wrap items-center gap-2">
                  <ReleaseNameEditor releaseId={rel.id} name={rel.name} />
                  {/* When collapsed, show latest active patch */}
                  <LatestActiveTag
                    patchIds={ids}
                    patchNames={names}
                    statusSnapshots={patchStatusById}
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="text-xs">{rel.patches.length} builds</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={
                      mode === "calendar"
                        ? `View list for release ${rel.name}`
                        : `View calendar for release ${rel.name}`
                    }
                    className="hidden group-open:inline-flex"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setViewModeByRelease((prev) => ({
                        ...prev,
                        [rel.id]: mode === "calendar" ? "list" : "calendar",
                      }));
                    }}
                  >
                    {mode === "calendar" ? (
                      <ListIcon className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <CalendarIcon className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                  <ChevronDown
                    className="h-4 w-4 text-neutral-600 transition-transform group-open:rotate-180 dark:text-neutral-300"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </summary>
            <div className="space-y-4 p-4">
              {mode === "calendar" ? (
                <ReleaseCalendar release={rel} events={calendarEvents} />
              ) : (
                <div className="relative grid w-full grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {rel.patches.map((b) => {
                    const componentState = componentStateByPatchId[b.id];
                    const componentsLoading =
                      componentState?.status === "loading";
                    const componentsError =
                      componentState?.status === "error"
                        ? componentState.error
                        : undefined;
                    return (
                      <PatchCard
                        key={b.id}
                        id={b.id}
                        name={b.name}
                        createdAt={b.createdAt}
                        releaseId={rel.id}
                        components={b.deployedComponents ?? []}
                        componentsLoading={componentsLoading}
                        componentsError={componentsError}
                        initialStatus={patchStatusById[b.id]}
                      />
                    );
                  })}
                  {hydrated && isFetching && (
                    <output
                      className="pointer-events-none absolute inset-0 flex items-center justify-center bg-neutral-100/40 text-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-200"
                      aria-atomic="true"
                    >
                      <span className="text-sm font-medium">
                        Refreshing
                        <span className="jrm-thinking" />
                      </span>
                    </output>
                  )}
                </div>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
