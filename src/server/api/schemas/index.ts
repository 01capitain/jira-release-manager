import { z } from "zod";

import { createPaginatedRequestSchema } from "~/shared/schemas/pagination";
import type { NormalizedPaginatedRequest } from "~/shared/types/pagination";

export const ComponentVersionListByBuiltSchema = z.object({
  builtVersionId: z.uuidv7({ error: "Invalid built version id" }),
});

export type ComponentVersionListByBuiltInput = z.infer<
  typeof ComponentVersionListByBuiltSchema
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

const builtVersionIdSchema = z.uuidv7({ error: "Invalid built version id" });

export const BuiltVersionStatusInputSchema = z.object({
  builtVersionId: builtVersionIdSchema,
});

export type BuiltVersionStatusInput = z.infer<
  typeof BuiltVersionStatusInputSchema
>;

export const BuiltVersionCreateSuccessorInputSchema = z.object({
  builtVersionId: builtVersionIdSchema,
  selectedReleaseComponentIds: z
    .array(z.uuidv7({ error: "Invalid release component id" }))
    .min(1, { error: "Select at least one component" }),
});

export type BuiltVersionCreateSuccessorInput = z.infer<
  typeof BuiltVersionCreateSuccessorInputSchema
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
