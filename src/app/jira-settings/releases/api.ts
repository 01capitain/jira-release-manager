"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { getJson, postJson, type RestApiError } from "~/lib/rest-client";

export type JiraStoredVersion = {
  id: string;
  jiraId: string;
  name: string;
  releaseStatus: string;
  releaseDate: string | null;
  startDate: string | null;
};

export type JiraStoredVersionsResponse = {
  total: number;
  items: JiraStoredVersion[];
};

export const storedVersionsQueryKey = (params: Record<string, unknown>) =>
  ["jira", "releases", "stored", params] as const;

export const fetchStoredVersions = async (params: {
  page: number;
  pageSize: number;
  includeReleased: boolean;
  includeUnreleased: boolean;
  includeArchived: boolean;
}): Promise<JiraStoredVersionsResponse> => {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    includeReleased: String(params.includeReleased),
    includeUnreleased: String(params.includeUnreleased),
    includeArchived: String(params.includeArchived),
  });
  return getJson<JiraStoredVersionsResponse>(
    `/api/v1/jira/releases/stored?${query.toString()}`,
  );
};

export const useStoredVersionsQuery = (params: {
  page: number;
  pageSize: number;
  includeReleased: boolean;
  includeUnreleased: boolean;
  includeArchived: boolean;
}) => {
  return useQuery<JiraStoredVersionsResponse>({
    queryKey: storedVersionsQueryKey(params),
    queryFn: () => fetchStoredVersions(params),
    placeholderData: (previousData) => previousData,
  });
};

export const syncStoredVersions = async (input: {
  includeReleased: boolean;
  includeUnreleased: boolean;
  includeArchived: boolean;
  pageSize: number;
}) => {
  return postJson<typeof input, { saved: number }>(
    "/api/v1/jira/releases/sync",
    input,
  );
};

export const useSyncStoredVersionsMutation = () => {
  return useMutation<
    { saved: number },
    RestApiError,
    {
      includeReleased: boolean;
      includeUnreleased: boolean;
      includeArchived: boolean;
      pageSize: number;
    }
  >({
    mutationFn: syncStoredVersions,
  });
};
