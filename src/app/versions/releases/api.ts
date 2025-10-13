"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { getJson, postJson } from "~/lib/rest-client";
import type { ReleaseVersionDto } from "~/shared/types/release-version";
import type { ReleaseVersionCreateInput } from "~/shared/schemas/release-version";
import type { PaginatedResponse } from "~/shared/types/pagination";
import type { ReleaseVersionWithBuildsDto } from "~/shared/types/release-version-with-builds";

export const createReleaseVersion = async (
  input: ReleaseVersionCreateInput,
): Promise<ReleaseVersionDto> => {
  return postJson<ReleaseVersionCreateInput, ReleaseVersionDto>(
    "/api/v1/release-versions",
    input,
  );
};

export const useCreateReleaseMutation = () => {
  return useMutation({
    mutationFn: createReleaseVersion,
  });
};

export const releaseVersionListQueryKey = (params: Record<string, unknown>) =>
  ["release-versions", "list", params] as const;

export const releasesWithBuildsQueryKey = ["release-versions", "with-builds"];

export const fetchReleaseVersions = async (
  params: {
    page?: number;
    pageSize?: number;
    sortBy?: string;
  } = {},
): Promise<PaginatedResponse<ReleaseVersionDto>> => {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.sortBy) search.set("sortBy", params.sortBy);
  const query = search.toString();
  const url = query
    ? `/api/v1/release-versions?${query}`
    : "/api/v1/release-versions";
  return getJson<PaginatedResponse<ReleaseVersionDto>>(url);
};

export const fetchReleasesWithBuilds = async (): Promise<
  ReleaseVersionWithBuildsDto[]
> => {
  return getJson<ReleaseVersionWithBuildsDto[]>(
    "/api/v1/release-versions/with-builds",
  );
};

export const useReleasesWithBuildsQuery = (options?: {
  enabled?: boolean;
  placeholderData?:
    | ReleaseVersionWithBuildsDto[]
    | (() => ReleaseVersionWithBuildsDto[] | undefined);
}) => {
  return useQuery({
    queryKey: releasesWithBuildsQueryKey,
    queryFn: fetchReleasesWithBuilds,
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
    placeholderData:
      typeof options?.placeholderData === "function"
        ? options.placeholderData
        : options?.placeholderData,
  });
};
