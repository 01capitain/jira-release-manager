"use client";

import * as React from "react";
import ReleasesAccordion from "./components/releases-accordion";
import { Button } from "~/components/ui/button";
import { ReleaseVersionCreateSchema } from "~/shared/schemas/release-version";
import {
  releasesWithPatchesQueryKey,
  useCreateReleaseMutation,
  useReleaseDefaultsQuery,
} from "./api";
import { isRestApiError } from "~/lib/rest-client";
import { useQueryClient } from "@tanstack/react-query";
import { useReleaseComponentsQuery } from "../components/api";
import {
  DEFAULT_RELEASE_TRACK,
  type ReleaseTrack,
} from "~/shared/types/release-track";

type DraftReleaseState = {
  name: string;
  releaseTrack: ReleaseTrack;
  error: string | null;
  isSaving: boolean;
  isLoadingDefaults: boolean;
  defaultsError?: string | null;
};

export default function VersionsReleasesPage() {
  const queryClient = useQueryClient();
  const createMutation = useCreateReleaseMutation();
  const defaultsQuery = useReleaseDefaultsQuery({ enabled: false });
  const defaultsData = defaultsQuery.data;
  const refetchDefaults = defaultsQuery.refetch;
  const [draftRelease, setDraftRelease] =
    React.useState<DraftReleaseState | null>(null);
  const { data: releaseComponentsPage } = useReleaseComponentsQuery();

  const startDraft = React.useCallback(async () => {
    setDraftRelease((prev) => ({
      name: defaultsData?.name ?? prev?.name ?? "",
      releaseTrack:
        defaultsData?.releaseTrack ??
        prev?.releaseTrack ??
        DEFAULT_RELEASE_TRACK,
      error: null,
      isSaving: false,
      isLoadingDefaults: true,
      defaultsError: null,
    }));
    try {
      const result = await refetchDefaults();
      setDraftRelease((prev) =>
        prev
          ? {
              ...prev,
              name: prev.name ?? result.data?.name ?? "",
              releaseTrack: result.data?.releaseTrack ?? prev.releaseTrack,
              isLoadingDefaults: false,
              defaultsError: result.error
                ? "Defaults unavailable, using fallback values."
                : null,
            }
          : prev,
      );
    } catch {
      setDraftRelease((prev) =>
        prev
          ? {
              ...prev,
              isLoadingDefaults: false,
              defaultsError: "Defaults unavailable, using fallback values.",
            }
          : prev,
      );
    }
  }, [defaultsData, refetchDefaults]);

  const resetDraft = React.useCallback(() => {
    setDraftRelease(null);
  }, []);

  const updateDraftName = React.useCallback((value: string) => {
    setDraftRelease((prev) => (prev ? { ...prev, name: value } : prev));
  }, []);

  const updateDraftTrack = React.useCallback((track: ReleaseTrack) => {
    setDraftRelease((prev) => (prev ? { ...prev, releaseTrack: track } : prev));
  }, []);

  const saveDraft = React.useCallback(async () => {
    if (!draftRelease || draftRelease.isSaving) return;
    const parsed = ReleaseVersionCreateSchema.safeParse({
      name: draftRelease.name,
      releaseTrack: draftRelease.releaseTrack,
    });
    if (!parsed.success) {
      setDraftRelease((prev) =>
        prev
          ? {
              ...prev,
              error: parsed.error.issues[0]?.message ?? "Invalid input",
            }
          : prev,
      );
      return;
    }
    setDraftRelease((prev) =>
      prev ? { ...prev, error: null, isSaving: true } : prev,
    );
    try {
      await createMutation.mutateAsync(parsed.data);
      setDraftRelease(null);
      await queryClient.invalidateQueries({
        queryKey: releasesWithPatchesQueryKey(undefined),
      });
    } catch (err) {
      setDraftRelease((prev) =>
        prev
          ? {
              ...prev,
              isSaving: false,
              error: isRestApiError(err)
                ? err.message
                : "Failed to create release. Please try again.",
            }
          : prev,
      );
    }
  }, [createMutation, draftRelease, queryClient]);

  const releaseComponentLookup = React.useMemo(() => {
    const items = releaseComponentsPage?.items ?? [];
    return items.reduce<Record<string, { color?: string }>>(
      (acc, component) => {
        acc[component.id] = { color: component.color };
        return acc;
      },
      {},
    );
  }, [releaseComponentsPage]);

  return (
    <div className="mx-auto w-full space-y-6 px-4 sm:px-6 xl:px-8">
      <section className="w-full space-y-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        {!draftRelease ? (
          <div className="flex items-end justify-start gap-2">
            <Button onClick={startDraft}>New Release</Button>
          </div>
        ) : null}

        <ReleasesAccordion
          releaseComponentLookup={releaseComponentLookup}
          draftRelease={draftRelease}
          onDraftNameChange={updateDraftName}
          onDraftTrackChange={updateDraftTrack}
          onDraftSave={saveDraft}
          onDraftCancel={resetDraft}
        />
      </section>
    </div>
  );
}
