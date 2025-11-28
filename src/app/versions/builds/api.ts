"use client";

import { useQueryClient } from "@tanstack/react-query";

import { requestJson } from "~/lib/rest-client";
import { withUiSpan } from "~/lib/otel/ui-span";
import type { ReleaseVersionWithPatchesDto } from "~/shared/types/release-version-with-patches";
import { releasesWithPatchesQueryKey } from "../releases/api";
import type { PatchAction, PatchStatus } from "~/shared/types/patch-status";
import type { PatchStatusResponse } from "~/shared/types/patch-status-response";

export type PatchTransitionResponse = {
  patch: {
    id: string;
    name: string;
    versionId: string;
    createdAt: string;
  };
  status: PatchStatus;
  history: PatchStatusResponse["history"];
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
