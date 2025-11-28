import { z } from "zod";

import { PatchIdSchema } from "~/server/zod/dto/patch.dto";
import type { PatchTransitionDto } from "~/shared/types/patch-transition";
import { IsoTimestampSchema } from "~/shared/types/iso8601";
import {
  PatchActionSchema,
  PatchStatusSchema,
} from "~/shared/types/patch-status";
import type { PatchAction } from "~/shared/types/patch-status";
import { UuidV7Schema } from "~/shared/types/uuid";
const DbPatchTransitionActionSchema = z.enum([
  "start_deployment",
  "cancel_deployment",
  "mark_active",
  "revert_to_deployment",
  "deprecate",
  "reactivate",
] as const);
const DbToApiActionMap: Record<
  z.infer<typeof DbPatchTransitionActionSchema>,
  PatchAction
> = {
  start_deployment: "startDeployment",
  cancel_deployment: "cancelDeployment",
  mark_active: "markActive",
  revert_to_deployment: "revertToDeployment",
  deprecate: "deprecate",
  reactivate: "reactivate",
};
const PatchTransitionModelSchema = z.object({
  id: UuidV7Schema,
  patchId: UuidV7Schema,
  fromStatus: PatchStatusSchema,
  toStatus: PatchStatusSchema,
  action: DbPatchTransitionActionSchema,
  createdAt: z.date(),
  createdById: UuidV7Schema,
});

export const PatchTransitionDtoSchema = z
  .object({
    id: UuidV7Schema,
    patchId: PatchIdSchema,
    fromStatus: PatchStatusSchema,
    toStatus: PatchStatusSchema,
    action: PatchActionSchema,
    createdAt: IsoTimestampSchema,
    createdById: UuidV7Schema,
  })
  .meta({
    id: "PatchTransition",
    title: "Patch Transition",
    description: "Status transition event for a patch.",
  });

export function toPatchTransitionDto(model: unknown): PatchTransitionDto {
  const parsed = PatchTransitionModelSchema.strip().parse(model);
  const raw = {
    id: parsed.id,
    patchId: parsed.patchId,
    fromStatus: parsed.fromStatus,
    toStatus: parsed.toStatus,
    action: DbToApiActionMap[parsed.action],
    createdAt:
      parsed.createdAt.toISOString() as PatchTransitionDto["createdAt"],
    createdById: parsed.createdById,
  };
  return PatchTransitionDtoSchema.strip().parse(raw);
}

export function mapToPatchTransitionDtos(
  models: readonly unknown[],
): PatchTransitionDto[] {
  return models.map((model) => toPatchTransitionDto(model));
}
