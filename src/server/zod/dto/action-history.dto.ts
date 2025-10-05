import { z } from "zod";

import type {
  ActionExecutionStatus,
  ActionHistoryEntryDto,
} from "~/shared/types/action-history";
import { IsoTimestampSchema } from "~/shared/types/iso8601";

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
  id: z.string().uuid(),
  subactionType: z.string(),
  message: z.string(),
  status: StatusSchema,
  createdAt: z.date(),
  metadata: z.unknown().optional(),
});

const ActionModelSchema = z.object({
  id: z.string().uuid(),
  actionType: z.string(),
  message: z.string(),
  status: StatusSchema,
  createdAt: z.date(),
  metadata: z.unknown().optional(),
  createdBy: z
    .object({
      id: z.string().uuid(),
      name: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
    })
    .optional(),
  subactions: z.array(ActionSubactionModelSchema),
});

const ActionMetadataSchema = z.object({}).catchall(z.unknown());

const ActionSubactionDtoSchema = z.object({
  id: z.string(),
  subactionType: z.string(),
  message: z.string(),
  status: StatusSchema,
  createdAt: IsoTimestampSchema,
  metadata: ActionMetadataSchema.nullable().optional(),
});

export const ActionHistoryEntryDtoSchema = z.object({
  id: z.string(),
  actionType: z.string(),
  message: z.string(),
  status: StatusSchema,
  createdAt: IsoTimestampSchema,
  createdBy: z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
  }),
  metadata: ActionMetadataSchema.nullable().optional(),
  subactions: z.array(ActionSubactionDtoSchema),
});

export function toActionHistoryEntryDto(model: unknown): ActionHistoryEntryDto {
  const parsed = ActionModelSchema.parse(model);
  const subactions = parsed.subactions.map((sub) => {
    const metadata = toMetadata(sub.metadata);
    return ActionSubactionDtoSchema.parse({
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
      : {
          id: "00000000-0000-0000-0000-000000000000", // sentinel UUID for system/unknown
          name: "System",
          email: null,
        },
    subactions,
    ...(metadata !== undefined ? { metadata } : {}),
  };
  return ActionHistoryEntryDtoSchema.parse(dto);
}

export function mapToActionHistoryEntryDtos(
  models: unknown[],
): ActionHistoryEntryDto[] {
  return models.map((model) => toActionHistoryEntryDto(model));
}
