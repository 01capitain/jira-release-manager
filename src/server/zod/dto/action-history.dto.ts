import { z } from "zod";

import type {
  ActionExecutionStatus,
  ActionHistoryEntryDto,
} from "~/shared/types/action-history";
import { IsoTimestampSchema } from "~/shared/types/iso8601";
import { UuidV7Schema } from "~/shared/types/uuid";
import { UserSummaryDtoSchema } from "~/server/zod/dto/user.dto";

const statusValues = [
  "success",
  "failed",
  "cancelled",
] as const satisfies readonly ActionExecutionStatus[];
const StatusSchema = z.enum(statusValues);

const toMetadata = (
  value: unknown,
): Record<string, unknown> | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
};

const ActionSubactionModelSchema = z.object({
  id: UuidV7Schema,
  subactionType: z.string(),
  message: z.string(),
  status: StatusSchema,
  createdAt: z.date(),
  metadata: z.unknown().optional(),
});

const ActionModelSchema = z.object({
  id: UuidV7Schema,
  actionType: z.string(),
  message: z.string(),
  status: StatusSchema,
  createdAt: z.date(),
  metadata: z.unknown().optional(),
  createdBy: z
    .object({
      id: UuidV7Schema,
      name: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
    })
    .optional(),
  subactions: z.array(ActionSubactionModelSchema),
});

const ActionMetadataSchema = z.object({}).catchall(z.unknown());

const SYSTEM_USER_DTO = {
  id: "00000000-0000-7000-8000-000000000000",
  name: "System",
  email: null,
} as const;

const ActionSubactionDtoSchema = z
  .object({
    id: UuidV7Schema,
    subactionType: z.string(),
    message: z.string(),
    status: StatusSchema,
    createdAt: IsoTimestampSchema,
    metadata: ActionMetadataSchema.nullable().optional(),
  })
  .meta({
    id: "ActionSubaction",
    title: "Action Subaction",
    description: "Subaction entry recorded within a user action history item.",
  });

export const ActionHistoryEntryDtoSchema = z
  .object({
    id: UuidV7Schema,
    actionType: z.string(),
    message: z.string(),
    status: StatusSchema,
    createdAt: IsoTimestampSchema,
    createdBy: UserSummaryDtoSchema,
    metadata: ActionMetadataSchema.nullable().optional(),
    subactions: z.array(ActionSubactionDtoSchema),
  })
  .meta({
    id: "ActionHistoryEntry",
    title: "Action History Entry",
    description: "Audit log entry for user or system actions.",
  });

export function toActionHistoryEntryDto(model: unknown): ActionHistoryEntryDto {
  const parsed = ActionModelSchema.strip().parse(model);
  const subactions = parsed.subactions.map((sub) => {
    const metadata = toMetadata(sub.metadata);
    return ActionSubactionDtoSchema.strip().parse({
      id: sub.id,
      subactionType: sub.subactionType,
      message: sub.message,
      status: sub.status,
      createdAt: sub.createdAt.toISOString(),
      ...(metadata !== undefined ? { metadata } : {}),
    });
  });
  const metadata = toMetadata(parsed.metadata);
  const dto = {
    id: parsed.id,
    actionType: parsed.actionType,
    message: parsed.message,
    status: parsed.status,
    createdAt:
      parsed.createdAt.toISOString() as ActionHistoryEntryDto["createdAt"],
    createdBy: parsed.createdBy
      ? {
          id: parsed.createdBy.id,
          name: parsed.createdBy.name ?? null,
          email: parsed.createdBy.email ?? null,
        }
      : SYSTEM_USER_DTO,
    subactions,
    ...(metadata !== undefined ? { metadata } : {}),
  };
  return ActionHistoryEntryDtoSchema.strip().parse(dto);
}

export function mapToActionHistoryEntryDtos(
  models: unknown[],
): ActionHistoryEntryDto[] {
  return models.map((model) => toActionHistoryEntryDto(model));
}
