import { z } from "zod";

import { PatchService } from "~/server/services/patch.service";
import type { RestContext } from "~/server/rest/context";
import { PatchDtoSchema } from "~/server/zod/dto/patch.dto";
import { PatchDefaultSelectionSchema } from "~/shared/schemas/patch-selection";
import { jsonErrorResponse } from "~/server/rest/openapi";
import {
  PatchActionSchema,
  PatchStatusSchema,
} from "~/shared/types/patch-status";

export const ReleasePatchesParamsSchema = z.object({
  releaseId: z.uuidv7(),
});

export const PatchIdParamSchema = z.object({
  patchId: z.uuidv7(),
});

export const PatchListResponseSchema = z.array(PatchDtoSchema);

export const PatchStatusHistoryEntrySchema = z.object({
  id: z.uuidv7(),
  fromStatus: PatchStatusSchema,
  toStatus: PatchStatusSchema,
  action: PatchActionSchema,
  createdAt: z.string(),
  createdById: z.uuidv7(),
});

export const PatchStatusResponseSchema = z.object({
  status: PatchStatusSchema,
  history: z.array(PatchStatusHistoryEntrySchema),
});

export const listPatches = async (context: RestContext, releaseId: string) => {
  const svc = new PatchService(context.db);
  const rows = await svc.listByRelease(releaseId);
  return PatchListResponseSchema.parse(rows);
};

export const getPatchDefaultSelection = async (
  context: RestContext,
  patchId: string,
) => {
  const svc = new PatchService(context.db);
  const selection = await svc.getDefaultSelection(patchId);
  return PatchDefaultSelectionSchema.parse(selection);
};

export const patchManagementPaths = {
  "/release-versions/{releaseId}/patches": {
    get: {
      operationId: "listPatches",
      summary: "List patches for a release",
      tags: ["Release Versions"],
      requestParams: {
        path: ReleasePatchesParamsSchema,
      },
      responses: {
        200: {
          description: "Patches",
          content: {
            "application/json": {
              schema: PatchListResponseSchema,
            },
          },
        },
        404: jsonErrorResponse("Release not found"),
      },
    },
  },
  "/patches/{patchId}/default-selection": {
    get: {
      operationId: "getPatchDefaultSelection",
      summary: "Get default component selection for a patch",
      tags: ["Release Versions"],
      requestParams: {
        path: PatchIdParamSchema,
      },
      responses: {
        200: {
          description: "Default component selection",
          content: {
            "application/json": {
              schema: PatchDefaultSelectionSchema,
            },
          },
        },
        404: jsonErrorResponse("Patch not found"),
      },
    },
  },
} as const;
