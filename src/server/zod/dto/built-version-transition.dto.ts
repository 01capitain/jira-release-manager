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
  const parsed = BuiltVersionTransitionModelSchema.pick({
    id: true,
    builtVersionId: true,
    fromStatus: true,
    toStatus: true,
    action: true,
    createdAt: true,
    createdById: true,
  }).parse(model);
  const dto: BuiltVersionTransitionDto = {
    id: parsed.id,
    builtVersionId: parsed.builtVersionId,
    fromStatus: parsed.fromStatus as BuiltVersionTransitionDto["fromStatus"],
    toStatus: parsed.toStatus as BuiltVersionTransitionDto["toStatus"],
    action: parsed.action as BuiltVersionTransitionDto["action"],
    createdAt:
      parsed.createdAt.toISOString() as BuiltVersionTransitionDto["createdAt"],
    createdById: parsed.createdById,
  };
  return BuiltVersionTransitionDtoSchema.parse(dto);
}

export function mapToBuiltVersionTransitionDtos(
  models: unknown[],
): BuiltVersionTransitionDto[] {
  return models.map((model) => toBuiltVersionTransitionDto(model));
}
