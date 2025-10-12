"use client";

import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { getJson, postJson } from "~/lib/rest-client";
import type { ReleaseComponentCreateInput } from "~/shared/schemas/release-component";
import type { ReleaseComponentDto } from "~/shared/types/release-component";

const RELEASE_COMPONENTS_PAGE_SIZE = 20;

export type ReleaseComponentListPage = {
  total: number;
  page: number;
  pageSize: number;
  items: ReleaseComponentDto[];
};

export const releaseComponentsQueryKey = [
  "release-components",
  "page",
  1,
] as const;

const buildListUrl = (): string => {
  const params = new URLSearchParams({
    page: "1",
    pageSize: String(RELEASE_COMPONENTS_PAGE_SIZE),
  });
  return `/api/v1/release-components?${params.toString()}`;
};

export const fetchReleaseComponents =
  async (): Promise<ReleaseComponentListPage> => {
    return getJson<ReleaseComponentListPage>(buildListUrl());
  };

export const releaseComponentsQueryOptions = () => ({
  queryKey: releaseComponentsQueryKey,
  queryFn: fetchReleaseComponents,
  staleTime: Number.POSITIVE_INFINITY,
});

type UseReleaseComponentsOptions = {
  enabled?: boolean;
};

export const useReleaseComponentsQuery = (
  options?: UseReleaseComponentsOptions,
) => {
  return useQuery({
    ...releaseComponentsQueryOptions(),
    enabled: options?.enabled ?? true,
  });
};

export const createReleaseComponent = async (
  input: ReleaseComponentCreateInput,
): Promise<ReleaseComponentDto> => {
  return postJson<ReleaseComponentCreateInput, ReleaseComponentDto>(
    "/api/v1/release-components",
    input,
  );
};

export const useCreateReleaseComponentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createReleaseComponent,
    onSuccess: (created) => {
      queryClient.setQueryData<ReleaseComponentListPage | undefined>(
        releaseComponentsQueryKey,
        (previous) => {
          if (!previous) {
            return {
              total: 1,
              page: 1,
              pageSize: RELEASE_COMPONENTS_PAGE_SIZE,
              items: [created],
            };
          }
          const alreadyExists = previous.items.some(
            (component) => component.id === created.id,
          );
          const dedupedItems = [
            created,
            ...previous.items.filter(
              (component) => component.id !== created.id,
            ),
          ];
          const trimmedItems =
            dedupedItems.length > previous.pageSize
              ? dedupedItems.slice(0, previous.pageSize)
              : dedupedItems;
          return {
            ...previous,
            total: alreadyExists ? previous.total : previous.total + 1,
            items: trimmedItems,
          };
        },
      );
    },
  });
};

export const prefetchReleaseComponents = (queryClient: QueryClient) => {
  return queryClient.ensureQueryData(releaseComponentsQueryOptions());
};
