import { z } from "zod";

import { ActionHistoryService } from "~/server/services/action-history.service";
import { BuiltVersionStatusService } from "~/server/services/built-version-status.service";
import {
  BuiltVersionDtoSchema,
  toBuiltVersionDto,
} from "~/server/zod/dto/built-version.dto";
import { BuiltVersionTransitionDtoSchema } from "~/server/zod/dto/built-version-transition.dto";
import type { RestContext } from "~/server/rest/context";
import { ensureAuthenticated } from "~/server/rest/auth";
import { RestError } from "~/server/rest/errors";
import { jsonErrorResponse } from "~/server/rest/openapi";
import type { BuiltVersionAction } from "~/shared/types/built-version-status";

export const BuiltVersionTransitionParamSchema = z.object({
  releaseId: z.uuidv7(),
  builtId: z.uuidv7(),
});

export const BuiltVersionTransitionResponseSchema = z
  .object({
    builtVersion: BuiltVersionDtoSchema,
    status: z.string(),
    history: z.array(BuiltVersionTransitionDtoSchema),
  })
  .meta({
    id: "BuiltVersionTransitionResult",
    title: "Built Version Transition Result",
    description:
      "Built version transition response including current status and history.",
  });

const transitions = [
  {
    action: "startDeployment" as const,
    segment: "start-deployment",
    summary: "Start deployment",
  },
  {
    action: "cancelDeployment" as const,
    segment: "cancel-deployment",
    summary: "Cancel deployment",
  },
  {
    action: "markActive" as const,
    segment: "mark-active",
    summary: "Mark active",
  },
  {
    action: "revertToDeployment" as const,
    segment: "revert-to-deployment",
    summary: "Revert to deployment",
  },
  {
    action: "deprecate" as const,
    segment: "deprecate",
    summary: "Deprecate",
  },
  {
    action: "reactivate" as const,
    segment: "reactivate",
    summary: "Reactivate",
  },
] satisfies readonly {
  action: BuiltVersionAction;
  segment: string;
  summary: string;
}[];

type TransitionParams = z.infer<typeof BuiltVersionTransitionParamSchema>;

const performTransition = async (
  context: RestContext,
  params: TransitionParams,
  action: BuiltVersionAction,
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
    actionType: `builtVersion.transition.${action}`,
    message: `Transition built version ${params.builtId} via ${action}`,
    userId,
    sessionToken: context.sessionToken ?? null,
  });

  try {
    const result = await statusService.transition(
      params.builtId,
      action,
      userId,
      {
        logger: actionLog,
      },
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
        action,
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
        action,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
};

export const startDeploymentBuiltVersion = (
  context: RestContext,
  params: TransitionParams,
) => performTransition(context, params, "startDeployment");

export const cancelDeploymentBuiltVersion = (
  context: RestContext,
  params: TransitionParams,
) => performTransition(context, params, "cancelDeployment");

export const markActiveBuiltVersion = (
  context: RestContext,
  params: TransitionParams,
) => performTransition(context, params, "markActive");

export const revertToDeploymentBuiltVersion = (
  context: RestContext,
  params: TransitionParams,
) => performTransition(context, params, "revertToDeployment");

export const deprecateBuiltVersion = (
  context: RestContext,
  params: TransitionParams,
) => performTransition(context, params, "deprecate");

export const reactivateBuiltVersion = (
  context: RestContext,
  params: TransitionParams,
) => performTransition(context, params, "reactivate");

const buildPathItem = (action: BuiltVersionAction, summary: string) => ({
  post: {
    operationId: `${action}BuiltVersion`,
    summary: `${summary} built version`,
    tags: ["Release Versions"],
    requestParams: {
      path: BuiltVersionTransitionParamSchema,
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
});

export const builtVersionPaths = transitions.reduce<
  Record<string, ReturnType<typeof buildPathItem>>
>((acc, { action, segment, summary }) => {
  acc[`/release-versions/{releaseId}/built-versions/{builtId}/${segment}`] =
    buildPathItem(action, summary);
  return acc;
}, {});
