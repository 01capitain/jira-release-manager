"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getJson,
  postJson,
  requestJson,
  type RestApiError,
} from "~/lib/rest-client";
import { withUiSpan } from "~/lib/otel/ui-span";
import type { PatchDto } from "~/shared/types/patch";
import type { PatchCreateInput } from "~/shared/schemas/patch";
import type { PatchDefaultSelection } from "~/shared/schemas/patch-selection";
import type { ReleaseVersionWithPatchesDto } from "~/shared/types/release-version-with-patches";
import { releasesWithPatchesQueryKey } from "../releases/api";
import type { PatchAction, PatchStatus } from "~/shared/types/patch-status";
import type { PatchStatusResponse } from "~/shared/types/patch-status-response";

export const patchesByReleaseQueryKey = (releaseId: string) =>
  ["patches", "by-release", releaseId] as const;

export const patchDefaultSelectionQueryKey = (patchId: string) =>
  ["patches", "default-selection", patchId] as const;

export type PatchTransitionResponse = {
  patch: PatchDto;
  status: PatchStatus;
  history: PatchStatusResponse["history"];
};

export const fetchPatchesByRelease = async (
  releaseId: string,
): Promise<PatchDto[]> => {
  return getJson<PatchDto[]>(`/api/v1/release-versions/${releaseId}/patches`);
};

export const fetchPatchDefaultSelection = async (
  patchId: string,
): Promise<PatchDefaultSelection> => {
  return getJson<PatchDefaultSelection>(
    `/api/v1/patches/${patchId}/default-selection`,
  );
};

export const createPatch = async (
  input: PatchCreateInput,
): Promise<PatchDto> => {
  return withUiSpan("ui.patch.create", () =>
    postJson<PatchCreateInput, PatchDto>(
      `/api/v1/release-versions/${input.versionId}/patches`,
      input,
    ),
  );
};

const transitionSegments: Record<PatchAction, string> = {
  startDeployment: "start-deployment",
  cancelDeployment: "cancel-deployment",
  markActive: "mark-active",
  revertToDeployment: "revert-to-deployment",
  deprecate: "deprecate",
  reactivate: "reactivate",
};

export const transitionPatch = async ({
  releaseId,
  patchId,
  action,
}: {
  releaseId: string;
  patchId: string;
  action: PatchAction;
}): Promise<PatchTransitionResponse> => {
  const segment = transitionSegments[action];
  return withUiSpan(`ui.patch.transition.${action}`, () =>
    requestJson<PatchTransitionResponse>(
      `/api/v1/release-versions/${releaseId}/patches/${patchId}/${segment}`,
      { method: "POST" },
    ),
  );
};

export type PatchSuccessorResponse = {
  summary: {
    moved: number;
    created: number;
    updated: number;
    successorPatchId: string;
  };
  status: PatchStatus;
  history: PatchStatusResponse["history"];
};

export const createSuccessorPatch = async (input: {
  patchId: string;
  selectedReleaseComponentIds: string[];
}): Promise<PatchSuccessorResponse> => {
  return withUiSpan("ui.patch.successor.create", () =>
    postJson<typeof input, PatchSuccessorResponse>(
      `/api/v1/patches/${input.patchId}/successor`,
      input,
    ),
  );
};

export const usePatchesByReleaseQuery = (releaseId: string) => {
  return useQuery({
    queryKey: patchesByReleaseQueryKey(releaseId),
    queryFn: () => fetchPatchesByRelease(releaseId),
  });
};

export const usePatchDefaultSelectionQuery = (
  patchId: string,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: patchDefaultSelectionQueryKey(patchId),
    queryFn: () => fetchPatchDefaultSelection(patchId),
    enabled: options?.enabled ?? true,
  });
};

export const useCreatePatchMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<PatchDto, RestApiError, PatchCreateInput>({
    mutationFn: createPatch,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["release-versions", "with-patches"],
      });
    },
  });
};

export const useReleasesWithPatchesRefetch = () => {
  const queryClient = useQueryClient();
  return {
    refetch: () =>
      queryClient.invalidateQueries({
        queryKey: ["release-versions", "with-patches"],
      }),
    setData: (
      updater:
        | ReleaseVersionWithPatchesDto[]
        | ((
            current: ReleaseVersionWithPatchesDto[] | undefined,
          ) => ReleaseVersionWithPatchesDto[] | undefined),
    ) =>
      queryClient.setQueryData<ReleaseVersionWithPatchesDto[] | undefined>(
        releasesWithPatchesQueryKey(),
        updater as ReleaseVersionWithPatchesDto[] | undefined,
      ),
  };
};
