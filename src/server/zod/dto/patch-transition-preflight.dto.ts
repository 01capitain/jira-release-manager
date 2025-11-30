import { z } from "zod";

import { PatchDtoSchema } from "~/server/zod/dto/patch.dto";
import { PatchTransitionDtoSchema } from "~/server/zod/dto/patch-transition.dto";
import { IsoTimestampSchema } from "~/shared/types/iso8601";
import {
  PatchActionSchema,
  PatchStatusSchema,
} from "~/shared/types/patch-status";
import type { PatchTransitionPreflightDto } from "~/shared/types/patch-transition";

const PatchTransitionActionContextSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("startDeployment"),
    nextPatchName: z.string(),
    missingComponentSelections: z.number().int().min(0),
    hasSuccessor: z.boolean(),
  }),
  z.object({
    action: z.literal("cancelDeployment"),
  }),
  z.object({
    action: z.literal("markActive"),
    readyForProd: z.boolean(),
    pendingApprovals: z.array(z.string()),
  }),
  z.object({
    action: z.literal("revertToDeployment"),
    activeSince: IsoTimestampSchema,
  }),
  z.object({
    action: z.literal("deprecate"),
    consumersImpacted: z.boolean(),
  }),
  z.object({
    action: z.literal("reactivate"),
    deprecatedSince: IsoTimestampSchema,
  }),
]);

export const PatchTransitionPreflightDtoSchema = z
  .object({
    action: PatchActionSchema,
    fromStatus: PatchStatusSchema,
    toStatus: PatchStatusSchema,
    allowed: z.boolean(),
    blockers: z.array(z.string()),
    warnings: z.array(z.string()),
    expectedSideEffects: z.array(z.string()),
    patch: PatchDtoSchema.pick({
      id: true,
      name: true,
      currentStatus: true,
      versionId: true,
    }),
    historyPreview: z.array(PatchTransitionDtoSchema),
    actionContext: PatchTransitionActionContextSchema.optional(),
  })
  .meta({
    id: "PatchTransitionPreflight",
    title: "Patch Transition Preflight",
    description:
      "Preflight result describing whether a transition is allowed and why.",
  });

export function toPatchTransitionPreflightDto(
  input: unknown,
): PatchTransitionPreflightDto {
  return PatchTransitionPreflightDtoSchema.parse(input);
}
