import { z } from "zod";
import type { BuiltVersionAction } from "~/shared/types/built-version-status";

export const ComponentVersionListByBuiltSchema = z.object({
  builtVersionId: z.string().uuid("Invalid built version id"),
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

export type ReleaseVersionListInput = z.infer<typeof ReleaseVersionListInputSchema>;

const builtVersionIdSchema = z.string().uuid("Invalid built version id");

export const BuiltVersionStatusInputSchema = z.object({
  builtVersionId: builtVersionIdSchema,
});

export type BuiltVersionStatusInput = z.infer<typeof BuiltVersionStatusInputSchema>;

const builtVersionActionValues = [
  "startDeployment",
  "cancelDeployment",
  "markActive",
  "revertToDeployment",
  "deprecate",
  "reactivate",
] as const satisfies readonly BuiltVersionAction[];

export const BuiltVersionTransitionInputSchema = z.object({
  builtVersionId: builtVersionIdSchema,
  action: z.enum(builtVersionActionValues),
});

export type BuiltVersionTransitionInput = z.infer<
  typeof BuiltVersionTransitionInputSchema
>;

export const BuiltVersionCreateSuccessorInputSchema = z.object({
  builtVersionId: builtVersionIdSchema,
  selectedReleaseComponentIds: z
    .array(z.string().uuid("Invalid release component id"))
    .min(1, "Select at least one component"),
});

export type BuiltVersionCreateSuccessorInput = z.infer<
  typeof BuiltVersionCreateSuccessorInputSchema
>;

const JiraEmailSchema = z.string().trim().email();

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

export type JiraFetchVersionsInput = z.infer<typeof JiraFetchVersionsInputSchema>;

export const JiraVerifyConnectionSchema = JiraCredentialsSchema;

export const ActionHistoryListInputSchema = z
  .object({
    limit: z.number().int().min(1).max(200).optional(),
  })
  .optional();

export type ActionHistoryListInput = z.infer<typeof ActionHistoryListInputSchema>;
