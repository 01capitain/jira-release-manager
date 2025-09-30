import { z } from "zod";

import type {
  ActionExecutionStatus,
  ActionHistoryEntryDto,
  ActionHistorySubentryDto,
  ActionHistoryUserDto,
} from "~/shared/types/action-history";
import { IsoTimestampSchema } from "~/shared/types/iso8601";

const StatusSchema = z.enum([
  "success",
  "failed",
  "cancelled",
] satisfies readonly ActionExecutionStatus[]);

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

const ActionSubactionDtoSchema = z.object({
  id: z.string(),
  subactionType: z.string(),
  message: z.string(),
  status: StatusSchema,
  createdAt: IsoTimestampSchema,
  metadata: z.unknown().optional(),
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
  metadata: z.unknown().optional(),
  subactions: z.array(ActionSubactionDtoSchema),
});

export function toActionHistoryEntryDto(model: unknown): ActionHistoryEntryDto {
  const parsed = ActionModelSchema.parse(model);
  const dto: ActionHistoryEntryDto = {
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
      : ({ id: "unknown" } as ActionHistoryUserDto),
    metadata: parsed.metadata as Record<string, unknown> | null | undefined,
    subactions: parsed.subactions.map((sub) => ({
      id: sub.id,
      subactionType: sub.subactionType,
      message: sub.message,
      status: sub.status,
      createdAt:
        sub.createdAt.toISOString() as ActionHistorySubentryDto["createdAt"],
      metadata: sub.metadata as Record<string, unknown> | null | undefined,
    })),
  };
  return ActionHistoryEntryDtoSchema.parse(dto);
}

export function mapToActionHistoryEntryDtos(
  models: unknown[],
): ActionHistoryEntryDto[] {
  return models.map((model) => toActionHistoryEntryDto(model));
}
