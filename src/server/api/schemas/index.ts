import { z } from "zod";

import { createPaginatedRequestSchema } from "~/shared/schemas/pagination";
import type { NormalizedPaginatedRequest } from "~/shared/types/pagination";

export const ComponentVersionListByPatchSchema = z.object({
  patchId: z.uuidv7({ error: "Invalid patch id" }),
});

export type ComponentVersionListByPatchInput = z.infer<
  typeof ComponentVersionListByPatchSchema
>;

export const RELEASE_VERSION_SORT_FIELDS = ["createdAt", "name"] as const;

export type ReleaseVersionSortableField =
  (typeof RELEASE_VERSION_SORT_FIELDS)[number];

export const DEFAULT_RELEASE_VERSION_LIST_INPUT: NormalizedPaginatedRequest<ReleaseVersionSortableField> =
  {
    page: 1,
    pageSize: 9,
    sortBy: "-createdAt",
  };

export const ReleaseVersionListInputSchema = createPaginatedRequestSchema(
  RELEASE_VERSION_SORT_FIELDS,
  {
    defaultPage: DEFAULT_RELEASE_VERSION_LIST_INPUT.page,
    defaultPageSize: DEFAULT_RELEASE_VERSION_LIST_INPUT.pageSize,
    defaultSortBy: DEFAULT_RELEASE_VERSION_LIST_INPUT.sortBy,
    maxPageSize: 100,
  },
).optional();

export type ReleaseVersionListInput = z.infer<
  typeof ReleaseVersionListInputSchema
>;

const patchIdSchema = z.uuidv7({ error: "Invalid patch id" });

export const PatchStatusInputSchema = z.object({
  patchId: patchIdSchema,
});

export type PatchStatusInput = z.infer<
  typeof PatchStatusInputSchema
>;

export const PatchCreateSuccessorInputSchema = z.object({
  patchId: patchIdSchema,
  selectedReleaseComponentIds: z
    .array(z.uuidv7({ error: "Invalid release component id" }))
    .min(1, { error: "Select at least one component" }),
});

export type PatchCreateSuccessorInput = z.infer<
  typeof PatchCreateSuccessorInputSchema
>;

const JiraEmailSchema = z.string().trim().pipe(z.email());

export const JiraCredentialsSchema = z.object({
  email: JiraEmailSchema,
  apiToken: z.string().min(1).optional(),
});

export type JiraCredentialsInput = z.infer<typeof JiraCredentialsSchema>;

export const JiraFetchVersionsInputSchema = z
  .object({
    pageSize: z.number().int().min(1).max(100).optional(),
    includeReleased: z.boolean().optional(),
    includeUnreleased: z.boolean().optional(),
    includeArchived: z.boolean().optional(),
  })
  .optional();

export type JiraFetchVersionsInput = z.infer<
  typeof JiraFetchVersionsInputSchema
>;

export const JiraVerifyConnectionSchema = JiraCredentialsSchema;

export const ACTION_HISTORY_SORT_FIELDS = ["createdAt"] as const;

export type ActionHistorySortableField =
  (typeof ACTION_HISTORY_SORT_FIELDS)[number];

export const DEFAULT_ACTION_HISTORY_LIST_INPUT: NormalizedPaginatedRequest<ActionHistorySortableField> =
  {
    page: 1,
    pageSize: 5,
    sortBy: "-createdAt",
  };

export const ActionHistoryListInputSchema = createPaginatedRequestSchema(
  ACTION_HISTORY_SORT_FIELDS,
  {
    defaultPage: DEFAULT_ACTION_HISTORY_LIST_INPUT.page,
    defaultPageSize: DEFAULT_ACTION_HISTORY_LIST_INPUT.pageSize,
    defaultSortBy: DEFAULT_ACTION_HISTORY_LIST_INPUT.sortBy,
    maxPageSize: 50,
  },
);

export type ActionHistoryListInput = z.infer<
  typeof ActionHistoryListInputSchema
>;
