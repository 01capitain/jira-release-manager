import { z } from "zod";

import { ActionHistoryService } from "~/server/services/action-history.service";
import { PatchService } from "~/server/services/patch.service";
import { PatchStatusService } from "~/server/services/patch-status.service";
import { SuccessorPatchService } from "~/server/services/successor-patch.service";
import { RestError } from "~/server/rest/errors";
import type { RestContext } from "~/server/rest/context";
import { ensureAuthenticated } from "~/server/rest/auth";
import { PatchDtoSchema } from "~/server/zod/dto/patch.dto";
import { ComponentVersionDtoSchema } from "~/server/zod/dto/component-version.dto";
import { PatchDefaultSelectionSchema } from "~/shared/schemas/patch-selection";
import { PatchCreateSchema } from "~/shared/schemas/patch";
import { PatchCreateSuccessorInputSchema } from "~/server/api/schemas";
import { jsonErrorResponse } from "~/server/rest/openapi";
import {
  PatchActionSchema,
  PatchStatusSchema,
} from "~/shared/types/patch-status";
import { mapToPatchTransitionDtos } from "~/server/zod/dto/patch-transition.dto";

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

export const createPatch = async (
  context: RestContext,
  releaseId: string,
  input: z.infer<typeof PatchCreateSchema>,
) => {
  const trimmed = input.name.trim();
  if (!trimmed) {
    throw new RestError(400, "VALIDATION_ERROR", "Name is required");
  }
  if (input.versionId !== releaseId) {
    throw new RestError(400, "VALIDATION_ERROR", "Release id mismatch", {
      pathReleaseId: releaseId,
      payloadReleaseId: input.versionId,
    });
  }

  const userId = ensureAuthenticated(context);
  const svc = new PatchService(context.db);
  const history = new ActionHistoryService(context.db);

  const action = await history.startAction({
    actionType: "patch.create",
    message: `Create patch ${trimmed}`,
    userId,
    sessionToken: context.sessionToken ?? null,
    metadata: { versionId: releaseId },
  });

  try {
    const result = await svc.create(userId, releaseId, trimmed, {
      logger: action,
    });
    await action.complete("success", {
      message: `Patch ${result.name} created`,
      metadata: { id: result.id, versionId: result.versionId },
    });
    return PatchDtoSchema.parse(result);
  } catch (error) {
    await action.complete("failed", {
      message: `Failed to create patch ${trimmed}`,
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        versionId: releaseId,
      },
    });
    throw error;
  }
};

export const getPatchStatus = async (context: RestContext, patchId: string) => {
  const svc = new PatchStatusService(context.db);
  const [status, history] = await Promise.all([
    svc.getCurrentStatus(patchId),
    svc.getHistory(patchId),
  ]);
  const mappedHistory = mapToPatchTransitionDtos(history).map(
    ({ patchId: _omit, ...entry }) => entry,
  );
  return PatchStatusResponseSchema.parse({
    status,
    history: mappedHistory,
  });
};

export const getPatchDefaultSelection = async (
  context: RestContext,
  patchId: string,
) => {
  const svc = new PatchService(context.db);
  const selection = await svc.getDefaultSelection(patchId);
  return PatchDefaultSelectionSchema.parse(selection);
};

export const createSuccessor = async (
  context: RestContext,
  input: z.infer<typeof PatchCreateSuccessorInputSchema>,
) => {
  const userId = ensureAuthenticated(context);
  const svc = new SuccessorPatchService(context.db);
  const statusSvc = new PatchStatusService(context.db);
  const historySvc = new ActionHistoryService(context.db);
  const actionLog = await historySvc.startAction({
    actionType: "patch.successor.apply",
    message: `Arrange successor components for ${input.patchId}`,
    userId,
    sessionToken: context.sessionToken ?? null,
    metadata: {
      selectionCount: input.selectedReleaseComponentIds.length,
    },
  });

  try {
    const summary = await svc.createSuccessorPatch(
      input.patchId,
      input.selectedReleaseComponentIds,
      userId,
      { logger: actionLog },
    );
    const status = await statusSvc.getCurrentStatus(input.patchId);
    const history = await statusSvc.getHistory(input.patchId);
    await actionLog.complete("success", {
      message: `Successor prepared for ${input.patchId}`,
      metadata: summary,
    });
    const mappedHistory = mapToPatchTransitionDtos(history).map(
      ({ patchId: _omit, ...entry }) => entry,
    );
    return {
      summary,
      status,
      history: mappedHistory,
    };
  } catch (error) {
    await actionLog.complete("failed", {
      message: `Failed to arrange successor for ${input.patchId}`,
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        patchId: input.patchId,
      },
    });
    throw error;
  }
};

export const PatchSuccessorResponseSchema = z.object({
  summary: z.object({
    moved: z.number().int(),
    created: z.number().int(),
    updated: z.number().int(),
    successorPatchId: z.string(),
  }),
  status: PatchStatusSchema,
  history: PatchStatusResponseSchema.shape.history,
});

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
    post: {
      operationId: "createPatch",
      summary: "Create patch",
      tags: ["Release Versions"],
      requestParams: {
        path: ReleasePatchesParamsSchema,
      },
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: PatchCreateSchema,
          },
        },
      },
      responses: {
        201: {
          description: "Patch created",
          content: {
            "application/json": {
              schema: PatchDtoSchema,
            },
          },
        },
        400: jsonErrorResponse("Validation error"),
        401: jsonErrorResponse("Authentication required"),
      },
    },
  },
  "/patches/{patchId}/status": {
    get: {
      operationId: "getPatchStatus",
      summary: "Get patch status",
      tags: ["Release Versions"],
      requestParams: {
        path: PatchIdParamSchema,
      },
      responses: {
        200: {
          description: "Patch status",
          content: {
            "application/json": {
              schema: PatchStatusResponseSchema,
            },
          },
        },
        404: jsonErrorResponse("Patch not found"),
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
  "/patches/{patchId}/component-versions": {
    get: {
      operationId: "listComponentVersionsByPatch",
      summary: "List component versions for a patch",
      tags: ["Release Versions"],
      requestParams: {
        path: PatchIdParamSchema,
      },
      responses: {
        200: {
          description: "Component versions",
          content: {
            "application/json": {
              schema: z.array(ComponentVersionDtoSchema),
            },
          },
        },
        404: jsonErrorResponse("Patch not found"),
      },
    },
  },
  "/patches/{patchId}/successor": {
    post: {
      operationId: "createSuccessorPatch",
      summary: "Arrange successor patch components",
      tags: ["Release Versions"],
      requestParams: {
        path: PatchIdParamSchema,
      },
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: PatchCreateSuccessorInputSchema,
          },
        },
      },
      responses: {
        200: {
          description: "Successor arrangement result",
          content: {
            "application/json": {
              schema: PatchSuccessorResponseSchema,
            },
          },
        },
        400: jsonErrorResponse("Validation error"),
        401: jsonErrorResponse("Authentication required"),
        404: jsonErrorResponse("Patch not found"),
      },
    },
  },
} as const;
