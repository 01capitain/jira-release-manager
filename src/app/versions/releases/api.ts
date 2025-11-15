"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { getJson, postJson } from "~/lib/rest-client";
import { withUiSpan } from "~/lib/otel/ui-span";
import type { ReleaseVersionCreateInput } from "~/shared/schemas/release-version";
import type { PaginatedResponse } from "~/shared/types/pagination";
import type { ReleaseVersionDto } from "~/shared/types/release-version";
import type { ReleaseVersionWithRelationsDto } from "~/shared/types/release-version-relations";
import type { ReleaseVersionWithBuildsDto } from "~/shared/types/release-version-with-builds";

export const createReleaseVersion = async (
  input: ReleaseVersionCreateInput,
): Promise<ReleaseVersionDto> => {
  return withUiSpan("ui.release.create", () =>
    postJson<ReleaseVersionCreateInput, ReleaseVersionDto>(
      "/api/v1/release-versions",
      input,
    ),
  );
};

export const useCreateReleaseMutation = () => {
  return useMutation({
    mutationFn: createReleaseVersion,
  });
};

export const releaseVersionListQueryKey = (params: Record<string, unknown>) =>
  ["release-versions", "list", params] as const;

export const releasesWithBuildsQueryKey = (fetchOptions?: {
  pageSize?: number;
  sortBy?: string;
  maxPages?: number;
}) => ["release-versions", "with-builds", fetchOptions] as const;

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

export const fetchReleasesWithBuilds = async (options?: {
  pageSize?: number;
  sortBy?: string;
  maxPages?: number;
}): Promise<ReleaseVersionWithBuildsDto[]> => {
  const DEFAULT_PAGE_SIZE = 10;
  const DEFAULT_SORT_BY = "-createdAt";
  const DEFAULT_MAX_PAGES = 1000;
  const MAX_ATTEMPTS = 3;
  const RETRY_BASE_DELAY_MS = 200;

  const {
    pageSize = DEFAULT_PAGE_SIZE,
    sortBy = DEFAULT_SORT_BY,
    maxPages = DEFAULT_MAX_PAGES,
  } = options ?? {};

  const aggregated: ReleaseVersionWithBuildsDto[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage && page <= maxPages) {
    const search = new URLSearchParams();
    search.set("page", String(page));
    search.set("pageSize", String(pageSize));
    search.set("sortBy", sortBy);
    search.append("relations", "builtVersions");
    search.append("relations", "builtVersions.deployedComponents");

    let response: PaginatedResponse<ReleaseVersionWithRelationsDto> | undefined;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        response = await getJson<
          PaginatedResponse<ReleaseVersionWithRelationsDto>
        >(`/api/v1/release-versions?${search.toString()}`);
        break;
      } catch (error) {
        if (attempt === MAX_ATTEMPTS) {
          const errorMessage = `Failed to fetch release versions page ${page} after ${MAX_ATTEMPTS} attempts (aggregated: ${aggregated.length})`;
          const details =
            error instanceof Error ? error.message : String(error);
          throw new Error(`${errorMessage}: ${details}`);
        }

        const delay = RETRY_BASE_DELAY_MS * attempt;
        await new Promise((resolve) => {
          setTimeout(resolve, delay);
        });
      }
    }

    if (!response) {
      throw new Error(
        `Unexpected: response undefined after retry loop for page ${page}`,
      );
    }

    aggregated.push(
      ...response.data.map<ReleaseVersionWithBuildsDto>((release) => ({
        id: release.id,
        name: release.name,
        createdAt: release.createdAt,
        builtVersions:
          release.builtVersions?.map(
            ({
              deployedComponents,
              transitions: _unusedTransitions,
              ...built
            }) => ({
              ...built,
              deployedComponents: deployedComponents ?? [],
            }),
          ) ?? [],
      })),
    );

    hasNextPage = response.pagination.hasNextPage;
    page += 1;
  }

  if (Number.isFinite(maxPages) && page > maxPages && hasNextPage) {
    throw new Error(
      `Pagination aborted after reaching maximum of ${maxPages} pages (aggregated: ${aggregated.length})`,
    );
  }

  return aggregated;
};

export const useReleasesWithBuildsQuery = (options?: {
  enabled?: boolean;
  placeholderData?:
    | ReleaseVersionWithBuildsDto[]
    | (() => ReleaseVersionWithBuildsDto[] | undefined);
  fetchOptions?: Parameters<typeof fetchReleasesWithBuilds>[0];
}) => {
  return useQuery({
    queryKey: releasesWithBuildsQueryKey(options?.fetchOptions),
    queryFn: () => fetchReleasesWithBuilds(options?.fetchOptions),
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
