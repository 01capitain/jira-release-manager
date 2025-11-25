"use client";

import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { getJson, postJson } from "~/lib/rest-client";
import { withUiSpan } from "~/lib/otel/ui-span";
import type { ReleaseVersionCreateInput } from "~/shared/schemas/release-version";
import type { PaginatedResponse } from "~/shared/types/pagination";
import type { ReleaseVersionDto } from "~/shared/types/release-version";
import type { ReleaseVersionWithRelationsDto } from "~/shared/types/release-version-relations";
import type {
  ReleaseBuiltVersionDto,
  ReleaseVersionWithBuildsDto,
} from "~/shared/types/release-version-with-builds";
import type { ComponentVersionDto } from "~/shared/types/component-version";
import type { BuiltVersionStatusResponse } from "~/shared/types/built-version-status-response";

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
    search.append("relations", "builtVersions.transitions");

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
            ({ deployedComponents, transitions, ...built }) => {
              const hasComponentData = Array.isArray(deployedComponents);
              const hasStatusData = Array.isArray(transitions);
              return {
                ...built,
                deployedComponents: hasComponentData
                  ? (deployedComponents ?? [])
                  : [],
                transitions: hasStatusData ? (transitions ?? []) : [],
                hasComponentData,
                hasStatusData,
              };
            },
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

type ReleaseCollections = {
  releases: ReleaseVersionWithBuildsDto[];
  releaseIds: string[];
  releasesById: Record<string, ReleaseVersionWithBuildsDto>;
  builtById: Record<string, ReleaseBuiltVersionDto & { releaseId: string }>;
  builtIdsByReleaseId: Record<string, string[]>;
  builtStatusById: Record<string, BuiltVersionStatusResponse>;
  missingComponentBuiltIds: string[];
};

const sortTransitionsAsc = (
  transitions: ReleaseBuiltVersionDto["transitions"] = [],
) => {
  return [...transitions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
};

export const mapReleaseCollections = (
  releases: ReleaseVersionWithBuildsDto[] | undefined,
): ReleaseCollections => {
  const safeReleases = releases ?? [];
  const releaseIds: string[] = [];
  const releasesById: Record<string, ReleaseVersionWithBuildsDto> = {};
  const builtIdsByReleaseId: Record<string, string[]> = {};
  const builtById: Record<
    string,
    ReleaseBuiltVersionDto & { releaseId: string }
  > = {};
  const builtStatusById: Record<string, BuiltVersionStatusResponse> = {};
  const missingComponentBuiltIds: string[] = [];

  safeReleases.forEach((release) => {
    releaseIds.push(release.id);
    releasesById[release.id] = release;
    const builtIds: string[] = [];
    release.builtVersions.forEach((built) => {
      builtIds.push(built.id);
      builtById[built.id] = { ...built, releaseId: release.id };
      if (!built.hasComponentData) {
        missingComponentBuiltIds.push(built.id);
      }
      if (built.hasStatusData) {
        const sortedHistory = sortTransitionsAsc(built.transitions);
        const status = sortedHistory.at(-1)?.toStatus ?? "in_development";
        builtStatusById[built.id] = {
          status,
          history: sortedHistory.map((transition) => ({
            id: transition.id,
            fromStatus: transition.fromStatus,
            toStatus: transition.toStatus,
            action: transition.action,
            createdAt: transition.createdAt,
            createdById: transition.createdById,
          })),
        };
      }
    });
    builtIdsByReleaseId[release.id] = builtIds;
  });

  return {
    releases: safeReleases,
    releaseIds,
    releasesById,
    builtById,
    builtIdsByReleaseId,
    builtStatusById,
    missingComponentBuiltIds,
  };
};

type ComponentBackfillState = {
  status: "idle" | "loading" | "success" | "error";
  components?: ComponentVersionDto[];
  error?: string;
};

const fetchBuiltComponentVersions = async (
  builtVersionId: string,
): Promise<ComponentVersionDto[]> => {
  return getJson<ComponentVersionDto[]>(
    `/api/v1/built-versions/${builtVersionId}/component-versions`,
  );
};

export const useReleaseEntities = (
  options?: Parameters<typeof useReleasesWithBuildsQuery>[0],
) => {
  const query = useReleasesWithBuildsQuery(options);
  const collections = React.useMemo(
    () => mapReleaseCollections(query.data),
    [query.data],
  );
  const [componentState, setComponentState] = React.useState<
    Record<string, ComponentBackfillState>
  >({});

  React.useEffect(() => {
    setComponentState((prev) => {
      const nextEntries = Object.entries(prev).filter(([builtId]) =>
        Boolean(collections.builtById[builtId]),
      );
      if (nextEntries.length === Object.keys(prev).length) {
        return prev;
      }
      const next: Record<string, ComponentBackfillState> = {};
      nextEntries.forEach(([builtId, state]) => {
        next[builtId] = state;
      });
      return next;
    });
  }, [collections.builtById]);

  React.useEffect(() => {
    if (collections.missingComponentBuiltIds.length === 0) return;
    let cancelled = false;
    collections.missingComponentBuiltIds.forEach((builtId) => {
      const currentState = componentState[builtId];
      if (
        currentState?.status === "loading" ||
        currentState?.status === "success"
      ) {
        return;
      }
      setComponentState((prev) => ({
        ...prev,
        [builtId]: { status: "loading" },
      }));
      void fetchBuiltComponentVersions(builtId)
        .then((components) => {
          if (cancelled) return;
          setComponentState((prev) => ({
            ...prev,
            [builtId]: { status: "success", components },
          }));
        })
        .catch((error) => {
          if (cancelled) return;
          setComponentState((prev) => ({
            ...prev,
            [builtId]: {
              status: "error",
              components: [],
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to load components",
            },
          }));
        });
    });
    return () => {
      cancelled = true;
    };
  }, [collections.missingComponentBuiltIds, componentState]);

  const builtById = React.useMemo(() => {
    const patched = { ...collections.builtById };
    Object.entries(componentState).forEach(([builtId, state]) => {
      const entry = patched[builtId];
      if (state.status === "success" && state.components && entry) {
        patched[builtId] = {
          ...entry,
          deployedComponents: state.components,
          hasComponentData: true,
        };
      }
    });
    return patched;
  }, [collections.builtById, componentState]);

  const releases = React.useMemo(() => {
    return collections.releaseIds
      .map((releaseId) => {
        const release = collections.releasesById[releaseId];
        if (!release) {
          return null;
        }
        const builtIds = collections.builtIdsByReleaseId[releaseId] ?? [];
        const builtVersions = builtIds
          .map((builtId) => {
            const built = builtById[builtId];
            if (!built) return null;
            const { releaseId: releaseOwner, ...rest } = built;
            void releaseOwner;
            return rest;
          })
          .filter((entry): entry is ReleaseBuiltVersionDto => entry !== null);
        return {
          ...release,
          builtVersions,
        };
      })
      .filter(
        (release): release is ReleaseVersionWithBuildsDto => release !== null,
      );
  }, [
    builtById,
    collections.builtIdsByReleaseId,
    collections.releaseIds,
    collections.releasesById,
  ]);

  const releasesById = React.useMemo(() => {
    const next: Record<string, ReleaseVersionWithBuildsDto> = {};
    releases.forEach((release) => {
      next[release.id] = release;
    });
    return next;
  }, [releases]);

  return {
    ...query,
    releases,
    releaseIds: collections.releaseIds,
    releasesById,
    builtIdsByReleaseId: collections.builtIdsByReleaseId,
    builtById,
    builtStatusById: collections.builtStatusById,
    componentStateByBuiltId: componentState,
  };
};
