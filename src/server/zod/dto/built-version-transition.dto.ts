import { z } from "zod";

import { BuiltVersionIdSchema } from "~/server/zod/dto/built-version.dto";
import type { BuiltVersionTransitionDto } from "~/shared/types/built-version-transition";
import { IsoTimestampSchema } from "~/shared/types/iso8601";
import { UuidV7Schema } from "~/shared/types/uuid";
const BuiltVersionTransitionModelSchema = z.object({
  id: UuidV7Schema,
  builtVersionId: UuidV7Schema,
  fromStatus: z.string(),
  toStatus: z.string(),
  action: z.string(),
  createdAt: z.date(),
  createdById: UuidV7Schema,
});

export const BuiltVersionTransitionDtoSchema = z
  .object({
    id: UuidV7Schema,
    builtVersionId: BuiltVersionIdSchema,
    fromStatus: z.string(),
    toStatus: z.string(),
    action: z.string(),
    createdAt: IsoTimestampSchema,
    createdById: UuidV7Schema,
  })
  .meta({
    id: "BuiltVersionTransition",
    title: "Built Version Transition",
    description: "Status transition event for a built version.",
  });

export function toBuiltVersionTransitionDto(
  model: unknown,
): BuiltVersionTransitionDto {
  const parsed = BuiltVersionTransitionModelSchema.strip().parse(model);
  const raw = {
    id: parsed.id,
    builtVersionId: parsed.builtVersionId,
    fromStatus: parsed.fromStatus,
    toStatus: parsed.toStatus,
    action: parsed.action,
    createdAt:
      parsed.createdAt.toISOString() as BuiltVersionTransitionDto["createdAt"],
    createdById: parsed.createdById,
  };
  return BuiltVersionTransitionDtoSchema.strip().parse(
    raw,
  ) as BuiltVersionTransitionDto;
}

export function mapToBuiltVersionTransitionDtos(
  models: unknown[],
): BuiltVersionTransitionDto[] {
  return models.map((model) => toBuiltVersionTransitionDto(model));
}
