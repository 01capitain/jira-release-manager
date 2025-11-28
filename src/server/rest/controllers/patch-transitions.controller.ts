import { z } from "zod";

import { ActionHistoryService } from "~/server/services/action-history.service";
import { PatchStatusService } from "~/server/services/patch-status.service";
import {
  PatchDtoSchema,
  PatchIdSchema,
  toPatchDto,
} from "~/server/zod/dto/patch.dto";
import { PatchTransitionDtoSchema } from "~/server/zod/dto/patch-transition.dto";
import type { RestContext } from "~/server/rest/context";
import { ensureAuthenticated } from "~/server/rest/auth";
import { RestError } from "~/server/rest/errors";
import { jsonErrorResponse } from "~/server/rest/openapi";
import { PatchStatusSchema } from "~/shared/types/patch-status";
import type { PatchAction } from "~/shared/types/patch-status";
import { ReleaseVersionIdSchema } from "~/server/zod/dto/release-version.dto";

export const PatchTransitionParamSchema = z.object({
  releaseId: ReleaseVersionIdSchema,
  patchId: PatchIdSchema,
});

export const PatchTransitionResponseSchema = z
  .object({
    patch: PatchDtoSchema,
    status: PatchStatusSchema,
    history: z.array(PatchTransitionDtoSchema),
  })
  .meta({
    id: "PatchTransitionResult",
    title: "Patch Transition Result",
    description: "Patch transition response including current status and history.",
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
  action: PatchAction;
  segment: string;
  summary: string;
}[];

type TransitionParams = z.infer<typeof PatchTransitionParamSchema>;

const performTransition = async (
  context: RestContext,
  params: TransitionParams,
  action: PatchAction,
) => {
  const userId = ensureAuthenticated(context);
  const patchRecord = await context.db.patch.findUnique({
    where: { id: params.patchId },
    select: {
      id: true,
      name: true,
      versionId: true,
      createdAt: true,
    },
  });
  if (!patchRecord) {
    throw new RestError(404, "NOT_FOUND", "Patch not found", {
      patchId: params.patchId,
    });
  }
  if (patchRecord.versionId !== params.releaseId) {
    throw new RestError(
      404,
      "NOT_FOUND",
      "Patch does not belong to the release",
      {
        releaseId: params.releaseId,
        patchId: params.patchId,
      },
    );
  }

  const statusService = new PatchStatusService(context.db);
  const historyService = new ActionHistoryService(context.db);
  const actionLog = await historyService.startAction({
    actionType: `patch.transition.${action}`,
    message: `Transition patch ${params.patchId} via ${action}`,
    userId,
    sessionToken: context.sessionToken ?? null,
  });

  try {
    const result = await statusService.transition(
      params.patchId,
      action,
      userId,
      {
        logger: actionLog,
      },
    );
    const history = await statusService.getHistory(params.patchId);
    const mappedHistory = history.map((entry) => ({
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      action: entry.action,
      createdAt: entry.createdAt.toISOString(),
      createdById: entry.createdById,
    }));

    await actionLog.complete("success", {
      message: `Patch ${params.patchId} transitioned to ${result.status}`,
      metadata: {
        patchId: params.patchId,
        action,
      },
    });

    return PatchTransitionResponseSchema.parse({
      patch: toPatchDto(result.patch),
      status: result.status,
      history: mappedHistory,
    });
  } catch (error: unknown) {
    await actionLog.complete("failed", {
      message: `Failed to transition patch ${params.patchId}`,
      metadata: {
        action,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
};

export const startDeploymentPatch = (
  context: RestContext,
  params: TransitionParams,
) => performTransition(context, params, "startDeployment");

export const cancelDeploymentPatch = (
  context: RestContext,
  params: TransitionParams,
) => performTransition(context, params, "cancelDeployment");

export const markActivePatch = (
  context: RestContext,
  params: TransitionParams,
) => performTransition(context, params, "markActive");

export const revertToDeploymentPatch = (
  context: RestContext,
  params: TransitionParams,
) => performTransition(context, params, "revertToDeployment");

export const deprecatePatch = (
  context: RestContext,
  params: TransitionParams,
) => performTransition(context, params, "deprecate");

export const reactivatePatch = (
  context: RestContext,
  params: TransitionParams,
) => performTransition(context, params, "reactivate");

const createPathItem = (action: PatchAction, summary: string) => ({
  post: {
    operationId: `${action}Patch`,
    summary: `${summary} patch`,
    tags: ["Release Versions"],
    requestParams: {
      path: PatchTransitionParamSchema,
    },
    responses: {
      200: {
        description: "Transition result",
        content: {
          "application/json": {
            schema: PatchTransitionResponseSchema,
          },
        },
      },
      400: jsonErrorResponse("Invalid transition"),
      401: jsonErrorResponse("Authentication required"),
      404: jsonErrorResponse("Patch not found"),
    },
  },
});

export const patchPaths = transitions.reduce<
  Record<string, ReturnType<typeof createPathItem>>
>((acc, { action, segment, summary }) => {
  acc[`/release-versions/{releaseId}/patches/{patchId}/${segment}`] =
    createPathItem(action, summary);
  return acc;
}, {});
