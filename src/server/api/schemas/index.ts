import { z } from "zod";

export const ComponentVersionListByBuiltSchema = z.object({
  builtVersionId: z.uuidv7({ error: "Invalid built version id" }),
});

export type ComponentVersionListByBuiltInput = z.infer<
  typeof ComponentVersionListByBuiltSchema
>;

export const ReleaseVersionListInputSchema = z
  .object({
    page: z.number().int().min(1).optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
  })
  .optional();

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

export const ActionHistoryListInputSchema = z
  .object({
    limit: z.number().int().min(1).max(200).optional(),
    cursor: z.uuidv7({ error: "Invalid action history cursor" }).optional(),
  })
  .optional();

export type ActionHistoryListInput = z.infer<
  typeof ActionHistoryListInputSchema
>;
