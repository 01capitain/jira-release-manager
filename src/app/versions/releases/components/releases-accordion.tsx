"use client";

import {
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  List as ListIcon,
  Pencil,
  X as XIcon,
} from "lucide-react";
import * as React from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { isRestApiError } from "~/lib/rest-client";
import { ReleaseVersionUpdateSchema } from "~/shared/schemas/release-version";
import type { PatchStatusResponse } from "~/shared/types/patch-status-response";
import type { ReleaseTrack } from "~/shared/types/release-track";
import type { ReleaseVersionWithPatchesDto } from "~/shared/types/release-version-with-patches";
import PatchCard from "../../builds/components/patch-card";
import {
  useReleaseEntities,
  useUpdateReleaseMutation,
  useUpdateReleaseTrackMutation,
} from "../api";
import { mapPatchesToCalendarEvents } from "../lib/calendar-events";
import ReleaseCalendar from "./release-calendar";
import { ReleaseTrackPicker } from "./release-track-picker";

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

type DraftReleaseData = {
  name: string;
  releaseTrack: ReleaseTrack;
  error: string | null;
  isSaving: boolean;
  isLoadingDefaults: boolean;
  defaultsError?: string | null;
  status?: "idle" | "saving" | "success";
};

const ReleaseNameEditor = ({
  releaseId,
  name,
  editingId,
  setEditingId,
  isOpen,
  anyOpen,
}: {
  releaseId: string;
  name: string;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  isOpen: boolean;
  anyOpen: boolean;
}) => {
  const mutation = useUpdateReleaseMutation();
  const editing = editingId === releaseId;
  const [value, setValue] = React.useState(name);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setValue(name);
    setError(null);
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
      setEditingId(null);
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
      <div className="group flex min-h-[2.4rem] items-center gap-2">
        <span className="text-base font-medium">Release {name}</span>
        {!isOpen && !anyOpen ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Rename release ${name}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setEditingId(releaseId);
            }}
            className="text-neutral-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-[2.4rem] items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onClick={(event) => {
          event.stopPropagation();
        }}
        aria-label="Release name"
        className="h-9 w-48"
        disabled={mutation.isPending}
      />
      <Button
        type="button"
        size="sm"
        onClick={onSave}
        disabled={mutation.isPending}
        className="h-9"
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
          setEditingId(null);
          setValue(name);
          setError(null);
        }}
        disabled={mutation.isPending}
      >
        <XIcon className="h-4 w-4" aria-hidden="true" />
      </Button>
      {mutation.isPending ? (
        <output
          role="status"
          aria-atomic="true"
          className="text-xs text-neutral-500 dark:text-neutral-400"
        >
          Saving…
        </output>
      ) : null}
      {error ? (
        <output
          role="alert"
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

  return (
    <ReleaseTrackPicker
      value={selectedTrack}
      onSelect={(track) => void handleSelect(track)}
      disabled={mutation.isPending}
      open={open}
      onOpenChange={setOpen}
      status={{
        pending: mutation.isPending,
        error,
      }}
      triggerLabel={`Release track: ${selectedTrack}. Click to change.`}
    />
  );
};

const DraftReleaseTrackSelector = ({
  value,
  onChange,
  disabled,
}: {
  value: ReleaseTrack;
  onChange: (track: ReleaseTrack) => void;
  disabled?: boolean;
}) => {
  const [open, setOpen] = React.useState(false);
  return (
    <ReleaseTrackPicker
      value={value}
      onSelect={(track) => onChange(track)}
      disabled={disabled}
      open={open}
      onOpenChange={setOpen}
      triggerLabel={`Release track: ${value}. Click to change.`}
    />
  );
};

const DraftReleaseRow = ({
  draft,
  onNameChange,
  onTrackChange,
  onSave,
  onCancel,
}: {
  draft: DraftReleaseData;
  onNameChange?: (value: string) => void;
  onTrackChange?: (value: ReleaseTrack) => void;
  onSave?: () => void;
  onCancel?: () => void;
}) => {
  const isSuccess = draft.status === "success";
  const isDisabled = draft.isSaving || isSuccess;
  return (
    <details
      open
      className="group rounded-md border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
    >
      <summary className="pointer-events-none flex cursor-default list-none items-stretch gap-3 rounded-md bg-neutral-50 pr-4 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
        <div className="pointer-events-auto">
          <DraftReleaseTrackSelector
            value={draft.releaseTrack}
            onChange={(next) => onTrackChange?.(next)}
            disabled={isDisabled}
          />
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-between gap-3 py-2 pr-4 pl-1">
          <div className="flex flex-wrap items-center gap-2">
            {!isSuccess ? (
              <div className="flex min-h-[2.4rem] items-center gap-2">
                <Input
                  value={draft.name}
                  onChange={(e) => onNameChange?.(e.target.value)}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  aria-label="Release name"
                  className="pointer-events-auto h-9 w-48"
                  disabled={isDisabled}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onSave?.();
                  }}
                  disabled={isDisabled}
                  className="pointer-events-auto h-9"
                >
                  Save
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Cancel new release"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onCancel?.();
                  }}
                  disabled={isDisabled}
                  className="pointer-events-auto"
                >
                  <XIcon className="h-4 w-4" aria-hidden="true" />
                </Button>
                {draft.isSaving ? (
                  <output
                    aria-atomic="true"
                    className="text-xs text-neutral-500 dark:text-neutral-400"
                  >
                    Saving…
                  </output>
                ) : null}
                {draft.error ? (
                  <output
                    role="alert"
                    aria-atomic="true"
                    className="text-xs text-red-600 dark:text-red-400"
                  >
                    {draft.error}
                  </output>
                ) : null}
              </div>
            ) : (
              <div className="flex min-h-[2.4rem] items-center gap-2 text-sm text-emerald-500 dark:text-emerald-300">
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>Release created</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            {draft.isLoadingDefaults ? <span>Loading defaults…</span> : null}
          </div>
        </div>
      </summary>
    </details>
  );
};

type ReleasesAccordionProps = {
  releaseComponentLookup: Record<string, { color?: string }>;
  draftRelease?: DraftReleaseData | null;
  onDraftNameChange?: (value: string) => void;
  onDraftTrackChange?: (track: ReleaseTrack) => void;
  onDraftSave?: () => void;
  onDraftCancel?: () => void;
  autoOpenReleaseId?: string | null;
};

export default function ReleasesAccordion({
  releaseComponentLookup,
  draftRelease,
  onDraftNameChange,
  onDraftTrackChange,
  onDraftSave,
  onDraftCancel,
  autoOpenReleaseId,
}: ReleasesAccordionProps) {
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => setHydrated(true), []);
  const [viewModeByRelease, setViewModeByRelease] = React.useState<
    Record<string, "list" | "calendar">
  >({});
  const [openReleaseIds, setOpenReleaseIds] = React.useState<
    Record<string, boolean>
  >({});

  React.useEffect(() => {
    if (!autoOpenReleaseId) return;
    setOpenReleaseIds((prev) =>
      prev[autoOpenReleaseId] ? prev : { ...prev, [autoOpenReleaseId]: true },
    );
  }, [autoOpenReleaseId]);

  const anyOpen =
    Object.values(openReleaseIds).some(Boolean) || Boolean(draftRelease);

  const { releases, isFetching, patchStatusById } = useReleaseEntities({
    enabled: true,
  });
  const [editingReleaseId, setEditingReleaseId] = React.useState<string | null>(
    null,
  );

  const normalizedReleases: ReleaseVersionWithPatchesDto[] = releases ?? [];

  return (
    <div className="space-y-5">
      {draftRelease ? (
        <DraftReleaseRow
          draft={draftRelease}
          onNameChange={onDraftNameChange}
          onTrackChange={onDraftTrackChange}
          onSave={onDraftSave}
          onCancel={onDraftCancel}
        />
      ) : null}
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
            open={openReleaseIds[rel.id] ?? false}
            className="group rounded-md border border-neutral-200 dark:border-neutral-800"
            onToggle={(event) => {
              const isOpen = (event.currentTarget as HTMLDetailsElement).open;
              if (isOpen) {
                setEditingReleaseId(null);
              }
              setOpenReleaseIds((prev) => ({ ...prev, [rel.id]: isOpen }));
            }}
          >
            <summary className="flex cursor-pointer list-none items-stretch gap-3 rounded-md bg-neutral-50 pr-4 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
              <ReleaseTrackSelector
                releaseId={rel.id}
                currentTrack={rel.releaseTrack}
              />
              <div className="flex flex-1 flex-wrap items-center justify-between gap-3 py-2 pr-4 pl-1">
                <div className="flex flex-wrap items-center gap-2">
                  <ReleaseNameEditor
                    releaseId={rel.id}
                    name={rel.name}
                    editingId={editingReleaseId}
                    setEditingId={setEditingReleaseId}
                    isOpen={openReleaseIds[rel.id] ?? false}
                    anyOpen={anyOpen}
                  />
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
                    return (
                      <PatchCard
                        key={b.id}
                        id={b.id}
                        name={b.name}
                        createdAt={b.createdAt}
                        releaseId={rel.id}
                        components={b.deployedComponents ?? []}
                        componentsLoading={false}
                        componentsError={undefined}
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
