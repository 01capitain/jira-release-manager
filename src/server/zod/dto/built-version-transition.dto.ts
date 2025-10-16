import { z } from "zod";

import type { BuiltVersionTransitionDto } from "~/shared/types/built-version-transition";
import { IsoTimestampSchema } from "~/shared/types/iso8601";
const BuiltVersionTransitionModelSchema = z.object({
  id: z.string(),
  builtVersionId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  action: z.string(),
  createdAt: z.date(),
  createdById: z.string(),
});

export const BuiltVersionTransitionDtoSchema = z.object({
  id: z.string(),
  builtVersionId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  action: z.string(),
  createdAt: IsoTimestampSchema,
  createdById: z.string(),
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
  return BuiltVersionTransitionDtoSchema.parse(
    raw,
  ) as BuiltVersionTransitionDto;
}

export function mapToBuiltVersionTransitionDtos(
  models: unknown[],
): BuiltVersionTransitionDto[] {
  return models.map((model) => toBuiltVersionTransitionDto(model));
}
