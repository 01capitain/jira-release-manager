import { z } from "zod";

import { ActionHistoryService } from "~/server/services/action-history.service";
import { BuiltVersionStatusService } from "~/server/services/built-version-status.service";
import {
  BuiltVersionDtoSchema,
  toBuiltVersionDto,
} from "~/server/zod/dto/built-version.dto";
import type { RestContext } from "~/server/rest/context";
import { ensureAuthenticated } from "~/server/rest/auth";
import { RestError } from "~/server/rest/errors";
import { jsonErrorResponse } from "~/server/rest/openapi";
import { BuiltVersionTransitionInputSchema } from "~/server/api/schemas";
import { IsoTimestampSchema } from "~/shared/types/iso8601";
const BuiltVersionActionSchema =
  BuiltVersionTransitionInputSchema.shape.action;

export const BuiltVersionTransitionParamSchema = z.object({
  releaseId: z.string().uuid(),
  builtId: z.string().uuid(),
});

export const BuiltVersionTransitionBodySchema = z.object({
  action: BuiltVersionActionSchema,
});

export const BuiltVersionTransitionHistoryEntrySchema = z.object({
  id: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  action: z.string(),
  createdAt: IsoTimestampSchema,
  createdById: z.string(),
});

export const BuiltVersionTransitionResponseSchema = z.object({
  builtVersion: BuiltVersionDtoSchema,
  status: z.string(),
  history: z.array(BuiltVersionTransitionHistoryEntrySchema),
});

export const transitionBuiltVersion = async (
  context: RestContext,
  params: z.infer<typeof BuiltVersionTransitionParamSchema>,
  body: z.infer<typeof BuiltVersionTransitionBodySchema>,
) => {
  const userId = ensureAuthenticated(context);
  const builtRecord = await context.db.builtVersion.findUnique({
    where: { id: params.builtId },
    select: {
      id: true,
      name: true,
      versionId: true,
      createdAt: true,
    },
  });
  if (!builtRecord) {
    throw new RestError(404, "NOT_FOUND", "Built version not found", {
      builtId: params.builtId,
    });
  }
  if (builtRecord.versionId !== params.releaseId) {
    throw new RestError(
      404,
      "NOT_FOUND",
      "Built version does not belong to the release",
      {
        releaseId: params.releaseId,
        builtId: params.builtId,
      },
    );
  }

  const statusService = new BuiltVersionStatusService(context.db);
  const historyService = new ActionHistoryService(context.db);
  const actionLog = await historyService.startAction({
    actionType: `builtVersion.transition.${body.action}`,
    message: `Transition built version ${params.builtId} via ${body.action}`,
    userId,
    sessionToken: context.sessionToken ?? null,
  });

  try {
    const result = await statusService.transition(
      params.builtId,
      body.action,
      userId,
      { logger: actionLog },
    );
    const history = await statusService.getHistory(params.builtId);
    const mappedHistory = history.map((entry) => ({
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      action: entry.action,
      createdAt: entry.createdAt.toISOString(),
      createdById: entry.createdById,
    }));

    await actionLog.complete("success", {
      message: `Built version ${params.builtId} transitioned to ${result.status}`,
      metadata: {
        builtVersionId: params.builtId,
        action: body.action,
      },
    });

    return BuiltVersionTransitionResponseSchema.parse({
      builtVersion: toBuiltVersionDto(result.builtVersion),
      status: result.status,
      history: mappedHistory,
    });
  } catch (error: unknown) {
    await actionLog.complete("failed", {
      message: `Failed to transition built version ${params.builtId}`,
      metadata: {
        action: body.action,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
};

export const builtVersionPaths = {
  "/release-versions/{releaseId}/built-versions/{builtId}/transitions": {
    post: {
      operationId: "transitionBuiltVersion",
      summary: "Transition built version",
      tags: ["Release Versions"],
      requestParams: {
        path: BuiltVersionTransitionParamSchema,
      },
      requestBody: {
        content: {
          "application/json": {
            schema: BuiltVersionTransitionBodySchema,
          },
        },
        required: true,
      },
      responses: {
        200: {
          description: "Transition result",
          content: {
            "application/json": {
              schema: BuiltVersionTransitionResponseSchema,
            },
          },
        },
        400: jsonErrorResponse("Invalid transition"),
        401: jsonErrorResponse("Authentication required"),
        404: jsonErrorResponse("Built version not found"),
      },
    },
  },
} as const;
