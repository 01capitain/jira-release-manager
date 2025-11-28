"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getJson, postJson, requestJson } from "~/lib/rest-client";
import { withUiSpan } from "~/lib/otel/ui-span";
import type {
  ReleaseVersionCreateInput,
  ReleaseVersionTrackUpdateInput,
} from "~/shared/schemas/release-version";
import type { PaginatedResponse } from "~/shared/types/pagination";
import type { ReleaseVersionDto } from "~/shared/types/release-version";
import type { ReleaseVersionWithRelationsDto } from "~/shared/types/release-version-relations";
import type {
  ReleasePatchDto,
  ReleaseVersionWithPatchesDto,
} from "~/shared/types/release-version-with-patches";
import type { ComponentVersionDto } from "~/shared/types/component-version";
import type { PatchStatusResponse } from "~/shared/types/patch-status-response";
import type { ReleaseTrack } from "~/shared/types/release-track";

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

export const updateReleaseVersionTrack = async (
  releaseId: string,
  input: ReleaseVersionTrackUpdateInput,
): Promise<ReleaseVersionDto> => {
  return withUiSpan("ui.release.track.update", () =>
    requestJson<ReleaseVersionDto>(
      `/api/v1/release-versions/${releaseId}/track`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),
  );
};

type UpdateReleaseTrackVariables = {
  releaseId: string;
  releaseTrack: ReleaseTrack;
};

export const useUpdateReleaseTrackMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ releaseId, releaseTrack }: UpdateReleaseTrackVariables) =>
      updateReleaseVersionTrack(releaseId, { releaseTrack }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["release-versions"] });
    },
  });
};

export const releaseVersionListQueryKey = (params: Record<string, unknown>) =>
  ["release-versions", "list", params] as const;

export const releasesWithPatchesQueryKey = (fetchOptions?: {
  pageSize?: number;
  sortBy?: string;
  maxPages?: number;
}) => ["release-versions", "with-patches", fetchOptions] as const;

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

export const fetchReleasesWithPatches = async (options?: {
  pageSize?: number;
  sortBy?: string;
  maxPages?: number;
}): Promise<ReleaseVersionWithPatchesDto[]> => {
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

  const aggregated: ReleaseVersionWithPatchesDto[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage && page <= maxPages) {
    const search = new URLSearchParams();
    search.set("page", String(page));
    search.set("pageSize", String(pageSize));
    search.set("sortBy", sortBy);
    search.append("relations", "patches");
    search.append("relations", "patches.deployedComponents");

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
      ...response.data.map<ReleaseVersionWithPatchesDto>((release) => ({
        id: release.id,
        name: release.name,
        releaseTrack: release.releaseTrack,
        createdAt: release.createdAt,
        patches:
          release.patches?.map(({ deployedComponents, ...patch }) => {
            const hasComponentData = Array.isArray(deployedComponents);
            return {
              ...patch,
              deployedComponents: hasComponentData ? deployedComponents : [],
              hasComponentData,
            };
          }) ?? [],
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

export const useReleasesWithPatchesQuery = (options?: {
  enabled?: boolean;
  placeholderData?:
    | ReleaseVersionWithPatchesDto[]
    | (() => ReleaseVersionWithPatchesDto[] | undefined);
  fetchOptions?: Parameters<typeof fetchReleasesWithPatches>[0];
}) => {
  return useQuery({
    queryKey: releasesWithPatchesQueryKey(options?.fetchOptions),
    queryFn: () => fetchReleasesWithPatches(options?.fetchOptions),
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
  releases: ReleaseVersionWithPatchesDto[];
  releaseIds: string[];
  releasesById: Record<string, ReleaseVersionWithPatchesDto>;
  patchById: Record<string, ReleasePatchDto & { releaseId: string }>;
  patchIdsByReleaseId: Record<string, string[]>;
  patchStatusById: Record<string, PatchStatusResponse>;
  missingComponentPatchIds: string[];
};

export const mapReleaseCollections = (
  releases: ReleaseVersionWithPatchesDto[] | undefined,
): ReleaseCollections => {
  const safeReleases = releases ?? [];
  const releaseIds: string[] = [];
  const releasesById: Record<string, ReleaseVersionWithPatchesDto> = {};
  const patchIdsByReleaseId: Record<string, string[]> = {};
  const patchById: Record<string, ReleasePatchDto & { releaseId: string }> = {};
  const patchStatusById: Record<string, PatchStatusResponse> = {};
  const missingComponentPatchIds: string[] = [];

  safeReleases.forEach((release) => {
    releaseIds.push(release.id);
    releasesById[release.id] = release;
    const patchIds: string[] = [];
    release.patches.forEach((patch) => {
      patchIds.push(patch.id);
      patchById[patch.id] = { ...patch, releaseId: release.id };
      if (!patch.hasComponentData) {
        missingComponentPatchIds.push(patch.id);
      }
      const status = patch.currentStatus ?? "in_development";
      patchStatusById[patch.id] = {
        status,
        history: [],
      };
    });
    patchIdsByReleaseId[release.id] = patchIds;
  });

  return {
    releases: safeReleases,
    releaseIds,
    releasesById,
    patchById,
    patchIdsByReleaseId,
    patchStatusById,
    missingComponentPatchIds,
  };
};

type ComponentBackfillState = {
  status: "idle" | "loading" | "success" | "error";
  components?: ComponentVersionDto[];
  error?: string;
};

const fetchPatchComponentVersions = async (
  patchId: string,
): Promise<ComponentVersionDto[]> => {
  return getJson<ComponentVersionDto[]>(
    `/api/v1/patches/${patchId}/component-versions`,
  );
};

export const useReleaseEntities = (
  options?: Parameters<typeof useReleasesWithPatchesQuery>[0],
) => {
  const query = useReleasesWithPatchesQuery(options);
  const collections = React.useMemo(
    () => mapReleaseCollections(query.data),
    [query.data],
  );
  const [componentState, setComponentState] = React.useState<
    Record<string, ComponentBackfillState>
  >({});

  React.useEffect(() => {
    setComponentState((prev) => {
      const nextEntries = Object.entries(prev).filter(([patchId]) =>
        Boolean(collections.patchById[patchId]),
      );
      if (nextEntries.length === Object.keys(prev).length) {
        return prev;
      }
      const next: Record<string, ComponentBackfillState> = {};
      nextEntries.forEach(([patchId, state]) => {
        next[patchId] = state;
      });
      return next;
    });
  }, [collections.patchById]);

  const pendingPatchIds = React.useMemo(() => {
    return collections.missingComponentPatchIds.filter((patchId) => {
      const state = componentState[patchId];
      return state?.status !== "loading" && state?.status !== "success";
    });
  }, [collections.missingComponentPatchIds, componentState]);

  React.useEffect(() => {
    if (pendingPatchIds.length === 0) return;
    let cancelled = false;
    pendingPatchIds.forEach((patchId) => {
      setComponentState((prev) => ({
        ...prev,
        [patchId]: { status: "loading" },
      }));
      void fetchPatchComponentVersions(patchId)
        .then((components) => {
          if (cancelled) return;
          setComponentState((prev) => ({
            ...prev,
            [patchId]: { status: "success", components },
          }));
        })
        .catch((error) => {
          if (cancelled) return;
          setComponentState((prev) => ({
            ...prev,
            [patchId]: {
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
  }, [pendingPatchIds]);

  const patchById = React.useMemo(() => {
    const patched = { ...collections.patchById };
    Object.entries(componentState).forEach(([patchId, state]) => {
      const entry = patched[patchId];
      if (state.status === "success" && state.components && entry) {
        patched[patchId] = {
          ...entry,
          deployedComponents: state.components,
          hasComponentData: true,
        };
      }
    });
    return patched;
  }, [collections.patchById, componentState]);

  const releases = React.useMemo(() => {
    return collections.releaseIds
      .map((releaseId) => {
        const release = collections.releasesById[releaseId];
        if (!release) {
          return null;
        }
        const patchIds = collections.patchIdsByReleaseId[releaseId] ?? [];
        const patches = patchIds
          .map((patchId) => {
            const patch = patchById[patchId];
            if (!patch) return null;
            const { releaseId: _releaseOwner, ...rest } = patch;
            if (_releaseOwner) {
              // noop: release ownership is only used to build lookups
            }
            return rest;
          })
          .filter((entry): entry is ReleasePatchDto => entry !== null);
        return {
          ...release,
          patches,
        };
      })
      .filter(
        (release): release is ReleaseVersionWithPatchesDto => release !== null,
      );
  }, [
    patchById,
    collections.patchIdsByReleaseId,
    collections.releaseIds,
    collections.releasesById,
  ]);

  const releasesById = React.useMemo(() => {
    const next: Record<string, ReleaseVersionWithPatchesDto> = {};
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
    patchIdsByReleaseId: collections.patchIdsByReleaseId,
    patchById,
    patchStatusById: collections.patchStatusById,
    componentStateByPatchId: componentState,
  };
};
