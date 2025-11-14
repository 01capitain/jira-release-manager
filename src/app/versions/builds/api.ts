"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getJson,
  postJson,
  requestJson,
  type RestApiError,
} from "~/lib/rest-client";
import { withUiSpan } from "~/lib/otel/ui-span";
import type { BuiltVersionDto } from "~/shared/types/built-version";
import type { BuiltVersionCreateInput } from "~/shared/schemas/built-version";
import type { BuiltVersionDefaultSelection } from "~/shared/schemas/built-version-selection";
import type { ComponentVersionDto } from "~/shared/types/component-version";
import type { ReleaseVersionWithBuildsDto } from "~/shared/types/release-version-with-builds";
import { releasesWithBuildsQueryKey } from "../releases/api";
import type {
  BuiltVersionAction,
  BuiltVersionStatus,
} from "~/shared/types/built-version-status";

export const builtVersionsByReleaseQueryKey = (releaseId: string) =>
  ["built-versions", "by-release", releaseId] as const;

export const builtVersionStatusQueryKey = (builtVersionId: string) =>
  ["built-versions", "status", builtVersionId] as const;

export const builtVersionDefaultSelectionQueryKey = (builtVersionId: string) =>
  ["built-versions", "default-selection", builtVersionId] as const;

export const componentVersionsByBuiltQueryKey = (builtVersionId: string) =>
  ["component-versions", "by-built", builtVersionId] as const;

export type BuiltVersionStatusResponse = {
  status: BuiltVersionStatus;
  history: {
    id: string;
    fromStatus: string;
    toStatus: string;
    action: string;
    createdAt: string;
    createdById: string;
  }[];
};

export type BuiltVersionTransitionResponse = {
  builtVersion: BuiltVersionDto;
  status: BuiltVersionStatus;
  history: BuiltVersionStatusResponse["history"];
};

export const fetchBuiltVersionsByRelease = async (
  releaseId: string,
): Promise<BuiltVersionDto[]> => {
  return getJson<BuiltVersionDto[]>(
    `/api/v1/release-versions/${releaseId}/built-versions`,
  );
};

export const fetchBuiltVersionStatus = async (
  builtVersionId: string,
): Promise<BuiltVersionStatusResponse> => {
  return getJson<BuiltVersionStatusResponse>(
    `/api/v1/built-versions/${builtVersionId}/status`,
  );
};

export const fetchBuiltVersionDefaultSelection = async (
  builtVersionId: string,
): Promise<BuiltVersionDefaultSelection> => {
  return getJson<BuiltVersionDefaultSelection>(
    `/api/v1/built-versions/${builtVersionId}/default-selection`,
  );
};

export const fetchComponentVersionsByBuilt = async (
  builtVersionId: string,
): Promise<ComponentVersionDto[]> => {
  return getJson<ComponentVersionDto[]>(
    `/api/v1/built-versions/${builtVersionId}/component-versions`,
  );
};

export const createBuiltVersion = async (
  input: BuiltVersionCreateInput,
): Promise<BuiltVersionDto> => {
  return withUiSpan("ui.built.create", () =>
    postJson<BuiltVersionCreateInput, BuiltVersionDto>(
      `/api/v1/release-versions/${input.versionId}/built-versions`,
      input,
    ),
  );
};

const transitionSegments: Record<BuiltVersionAction, string> = {
  startDeployment: "start-deployment",
  cancelDeployment: "cancel-deployment",
  markActive: "mark-active",
  revertToDeployment: "revert-to-deployment",
  deprecate: "deprecate",
  reactivate: "reactivate",
};

export const transitionBuiltVersion = async ({
  releaseId,
  builtVersionId,
  action,
}: {
  releaseId: string;
  builtVersionId: string;
  action: BuiltVersionAction;
}): Promise<BuiltVersionTransitionResponse> => {
  const segment = transitionSegments[action];
  return withUiSpan(`ui.built.transition.${action}`, () =>
    requestJson<BuiltVersionTransitionResponse>(
      `/api/v1/release-versions/${releaseId}/built-versions/${builtVersionId}/${segment}`,
      { method: "POST" },
    ),
  );
};

export type BuiltVersionSuccessorResponse = {
  summary: {
    moved: number;
    created: number;
    updated: number;
    successorBuiltId: string;
  };
  status: string;
  history: BuiltVersionStatusResponse["history"];
};

export const createSuccessorBuilt = async (input: {
  builtVersionId: string;
  selectedReleaseComponentIds: string[];
}): Promise<BuiltVersionSuccessorResponse> => {
  return withUiSpan("ui.built.successor.create", () =>
    postJson<typeof input, BuiltVersionSuccessorResponse>(
      `/api/v1/built-versions/${input.builtVersionId}/successor`,
      input,
    ),
  );
};

export const useBuiltVersionsByReleaseQuery = (releaseId: string) => {
  return useQuery({
    queryKey: builtVersionsByReleaseQueryKey(releaseId),
    queryFn: () => fetchBuiltVersionsByRelease(releaseId),
  });
};

export const useBuiltVersionStatusQuery = (
  builtVersionId: string,
  options?: {
    enabled?: boolean;
    staleTime?: number;
  },
) => {
  return useQuery({
    queryKey: builtVersionStatusQueryKey(builtVersionId),
    queryFn: () => fetchBuiltVersionStatus(builtVersionId),
    staleTime: options?.staleTime ?? Infinity,
    enabled: options?.enabled ?? true,
  });
};

export const useBuiltVersionDefaultSelectionQuery = (
  builtVersionId: string,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: builtVersionDefaultSelectionQueryKey(builtVersionId),
    queryFn: () => fetchBuiltVersionDefaultSelection(builtVersionId),
    enabled: options?.enabled ?? true,
  });
};

export const useComponentVersionsByBuiltQuery = (
  builtVersionId: string,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: componentVersionsByBuiltQueryKey(builtVersionId),
    queryFn: () => fetchComponentVersionsByBuilt(builtVersionId),
    enabled: options?.enabled ?? true,
  });
};

export const useCreateBuiltVersionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<BuiltVersionDto, RestApiError, BuiltVersionCreateInput>({
    mutationFn: createBuiltVersion,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["release-versions", "with-builds"],
      });
    },
  });
};

export const useReleasesWithBuildsRefetch = () => {
  const queryClient = useQueryClient();
  return {
    refetch: () =>
      queryClient.invalidateQueries({
        queryKey: ["release-versions", "with-builds"],
      }),
    setData: (
      updater:
        | ReleaseVersionWithBuildsDto[]
        | ((
            current: ReleaseVersionWithBuildsDto[] | undefined,
          ) => ReleaseVersionWithBuildsDto[] | undefined),
    ) =>
      queryClient.setQueryData<ReleaseVersionWithBuildsDto[] | undefined>(
        releasesWithBuildsQueryKey(),
        updater as ReleaseVersionWithBuildsDto[] | undefined,
      ),
  };
};
