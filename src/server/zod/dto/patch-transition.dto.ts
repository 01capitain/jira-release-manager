import { z } from "zod";

import { PatchIdSchema } from "~/server/zod/dto/patch.dto";
import type { PatchTransitionDto } from "~/shared/types/patch-transition";
import { IsoTimestampSchema } from "~/shared/types/iso8601";
import { UuidV7Schema } from "~/shared/types/uuid";
const PatchTransitionModelSchema = z.object({
  id: UuidV7Schema,
  patchId: UuidV7Schema,
  fromStatus: z.string(),
  toStatus: z.string(),
  action: z.string(),
  createdAt: z.date(),
  createdById: UuidV7Schema,
});

export const PatchTransitionDtoSchema = z
  .object({
    id: UuidV7Schema,
    patchId: PatchIdSchema,
    fromStatus: z.string(),
    toStatus: z.string(),
    action: z.string(),
    createdAt: IsoTimestampSchema,
    createdById: UuidV7Schema,
  })
  .meta({
    id: "PatchTransition",
    title: "Patch Transition",
    description: "Status transition event for a patch.",
  });

export function toPatchTransitionDto(
  model: unknown,
): PatchTransitionDto {
  const parsed = PatchTransitionModelSchema.strip().parse(model);
  const raw = {
    id: parsed.id,
    patchId: parsed.patchId,
    fromStatus: parsed.fromStatus,
    toStatus: parsed.toStatus,
    action: parsed.action,
    createdAt:
      parsed.createdAt.toISOString() as PatchTransitionDto["createdAt"],
    createdById: parsed.createdById,
  };
  return PatchTransitionDtoSchema.strip().parse(
    raw,
  ) as PatchTransitionDto;
}

export function mapToPatchTransitionDtos(
  models: readonly unknown[],
): PatchTransitionDto[] {
  return models.map((model) => toPatchTransitionDto(model));
}
