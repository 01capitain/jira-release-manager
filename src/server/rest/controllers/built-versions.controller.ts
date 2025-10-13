import { z } from "zod";

import { ActionHistoryService } from "~/server/services/action-history.service";
import { BuiltVersionService } from "~/server/services/built-version.service";
import { BuiltVersionStatusService } from "~/server/services/built-version-status.service";
import { SuccessorBuiltService } from "~/server/services/successor-built.service";
import { RestError } from "~/server/rest/errors";
import type { RestContext } from "~/server/rest/context";
import { ensureAuthenticated } from "~/server/rest/auth";
import { BuiltVersionDtoSchema } from "~/server/zod/dto/built-version.dto";
import { ComponentVersionDtoSchema } from "~/server/zod/dto/component-version.dto";
import { BuiltVersionDefaultSelectionSchema } from "~/shared/schemas/built-version-selection";
import { BuiltVersionCreateSchema } from "~/shared/schemas/built-version";
import { BuiltVersionCreateSuccessorInputSchema } from "~/server/api/schemas";
import { jsonErrorResponse } from "~/server/rest/openapi";

export const ReleaseBuiltVersionsParamsSchema = z.object({
  releaseId: z.uuidv7(),
});

export const BuiltVersionIdParamSchema = z.object({
  builtId: z.uuidv7(),
});

export const BuiltVersionListResponseSchema = z.array(BuiltVersionDtoSchema);

export const BuiltVersionStatusHistoryEntrySchema = z.object({
  id: z.uuidv7(),
  fromStatus: z.string(),
  toStatus: z.string(),
  action: z.string(),
  createdAt: z.string(),
  createdById: z.uuidv7(),
});

export const BuiltVersionStatusResponseSchema = z.object({
  status: z.string(),
  history: z.array(BuiltVersionStatusHistoryEntrySchema),
});

export const listBuiltVersions = async (
  context: RestContext,
  releaseId: string,
) => {
  const svc = new BuiltVersionService(context.db);
  const rows = await svc.listByRelease(releaseId);
  return BuiltVersionListResponseSchema.parse(rows);
};

export const createBuiltVersion = async (
  context: RestContext,
  releaseId: string,
  input: z.infer<typeof BuiltVersionCreateSchema>,
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
  const svc = new BuiltVersionService(context.db);
  const history = new ActionHistoryService(context.db);

  const action = await history.startAction({
    actionType: "builtVersion.create",
    message: `Create built version ${trimmed}`,
    userId,
    sessionToken: context.sessionToken ?? null,
    metadata: { versionId: releaseId },
  });

  try {
    const result = await svc.create(userId, releaseId, trimmed, {
      logger: action,
    });
    await action.complete("success", {
      message: `Built version ${result.name} created`,
      metadata: { id: result.id, versionId: result.versionId },
    });
    return BuiltVersionDtoSchema.parse(result);
  } catch (error) {
    await action.complete("failed", {
      message: `Failed to create built version ${trimmed}`,
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        versionId: releaseId,
      },
    });
    throw error;
  }
};

export const getBuiltVersionStatus = async (
  context: RestContext,
  builtVersionId: string,
) => {
  const svc = new BuiltVersionStatusService(context.db);
  const [status, history] = await Promise.all([
    svc.getCurrentStatus(builtVersionId),
    svc.getHistory(builtVersionId),
  ]);
  return BuiltVersionStatusResponseSchema.parse({
    status,
    history: history.map((entry) => ({
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      action: entry.action,
      createdAt: entry.createdAt.toISOString(),
      createdById: entry.createdById,
    })),
  });
};

export const getBuiltVersionDefaultSelection = async (
  context: RestContext,
  builtVersionId: string,
) => {
  const svc = new BuiltVersionService(context.db);
  const selection = await svc.getDefaultSelection(builtVersionId);
  return BuiltVersionDefaultSelectionSchema.parse(selection);
};

export const createSuccessor = async (
  context: RestContext,
  input: z.infer<typeof BuiltVersionCreateSuccessorInputSchema>,
) => {
  const userId = ensureAuthenticated(context);
  const svc = new SuccessorBuiltService(context.db);
  const statusSvc = new BuiltVersionStatusService(context.db);
  const historySvc = new ActionHistoryService(context.db);
  const actionLog = await historySvc.startAction({
    actionType: "builtVersion.successor.apply",
    message: `Arrange successor components for ${input.builtVersionId}`,
    userId,
    sessionToken: context.sessionToken ?? null,
    metadata: {
      selectionCount: input.selectedReleaseComponentIds.length,
    },
  });

  try {
    const summary = await svc.createSuccessorBuilt(
      input.builtVersionId,
      input.selectedReleaseComponentIds,
      userId,
      { logger: actionLog },
    );
    const status = await statusSvc.getCurrentStatus(input.builtVersionId);
    const history = await statusSvc.getHistory(input.builtVersionId);
    await actionLog.complete("success", {
      message: `Successor prepared for ${input.builtVersionId}`,
      metadata: summary,
    });
    return {
      summary,
      status,
      history: history.map((entry) => ({
        id: entry.id,
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        action: entry.action,
        createdAt: entry.createdAt.toISOString(),
        createdById: entry.createdById,
      })),
    };
  } catch (error) {
    await actionLog.complete("failed", {
      message: `Failed to arrange successor for ${input.builtVersionId}`,
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        builtVersionId: input.builtVersionId,
      },
    });
    throw error;
  }
};

export const BuiltVersionSuccessorResponseSchema = z.object({
  summary: z.object({
    moved: z.number().int(),
    created: z.number().int(),
    updated: z.number().int(),
    successorBuiltId: z.string(),
  }),
  status: z.string(),
  history: BuiltVersionStatusResponseSchema.shape.history,
});

export const builtVersionManagementPaths = {
  "/release-versions/{releaseId}/built-versions": {
    get: {
      operationId: "listBuiltVersions",
      summary: "List built versions for a release",
      tags: ["Release Versions"],
      requestParams: {
        path: ReleaseBuiltVersionsParamsSchema,
      },
      responses: {
        200: {
          description: "Built versions",
          content: {
            "application/json": {
              schema: BuiltVersionListResponseSchema,
            },
          },
        },
        404: jsonErrorResponse("Release not found"),
      },
    },
    post: {
      operationId: "createBuiltVersion",
      summary: "Create built version",
      tags: ["Release Versions"],
      requestParams: {
        path: ReleaseBuiltVersionsParamsSchema,
      },
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: BuiltVersionCreateSchema,
          },
        },
      },
      responses: {
        201: {
          description: "Built version created",
          content: {
            "application/json": {
              schema: BuiltVersionDtoSchema,
            },
          },
        },
        400: jsonErrorResponse("Validation error"),
        401: jsonErrorResponse("Authentication required"),
      },
    },
  },
  "/built-versions/{builtId}/status": {
    get: {
      operationId: "getBuiltVersionStatus",
      summary: "Get built version status",
      tags: ["Release Versions"],
      requestParams: {
        path: BuiltVersionIdParamSchema,
      },
      responses: {
        200: {
          description: "Built version status",
          content: {
            "application/json": {
              schema: BuiltVersionStatusResponseSchema,
            },
          },
        },
        404: jsonErrorResponse("Built version not found"),
      },
    },
  },
  "/built-versions/{builtId}/default-selection": {
    get: {
      operationId: "getBuiltVersionDefaultSelection",
      summary: "Get default component selection for a built version",
      tags: ["Release Versions"],
      requestParams: {
        path: BuiltVersionIdParamSchema,
      },
      responses: {
        200: {
          description: "Default component selection",
          content: {
            "application/json": {
              schema: BuiltVersionDefaultSelectionSchema,
            },
          },
        },
        404: jsonErrorResponse("Built version not found"),
      },
    },
  },
  "/built-versions/{builtId}/component-versions": {
    get: {
      operationId: "listComponentVersionsByBuilt",
      summary: "List component versions for a built version",
      tags: ["Release Versions"],
      requestParams: {
        path: BuiltVersionIdParamSchema,
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
        404: jsonErrorResponse("Built version not found"),
      },
    },
  },
  "/built-versions/{builtId}/successor": {
    post: {
      operationId: "createSuccessorBuilt",
      summary: "Arrange successor built components",
      tags: ["Release Versions"],
      requestParams: {
        path: BuiltVersionIdParamSchema,
      },
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: BuiltVersionCreateSuccessorInputSchema,
          },
        },
      },
      responses: {
        200: {
          description: "Successor arrangement result",
          content: {
            "application/json": {
              schema: BuiltVersionSuccessorResponseSchema,
            },
          },
        },
        400: jsonErrorResponse("Validation error"),
        401: jsonErrorResponse("Authentication required"),
        404: jsonErrorResponse("Built version not found"),
      },
    },
  },
} as const;
