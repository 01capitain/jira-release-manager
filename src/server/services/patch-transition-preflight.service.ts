import type { PrismaClient } from "@prisma/client";

import { RestError } from "~/server/rest/errors";
import { PatchStatusService } from "~/server/services/patch-status.service";
import { mapToPatchTransitionDtos } from "~/server/zod/dto/patch-transition.dto";
import { toPatchTransitionPreflightDto } from "~/server/zod/dto/patch-transition-preflight.dto";
import type {
  PatchTransitionActionContext,
  PatchTransitionPreflightDto,
} from "~/shared/types/patch-transition";
import { IsoTimestampSchema, type ISO8601 } from "~/shared/types/iso8601";
import {
  PatchActionSchema,
  type PatchAction,
  type PatchStatus,
} from "~/shared/types/patch-status";

type PatchRecord = {
  id: string;
  name: string;
  versionId: string;
  createdAt: Date;
  currentStatus: PatchStatus | null;
};

const HISTORY_PREVIEW_LIMIT = 5;

export const PATCH_TRANSITION_SIDE_EFFECTS: Record<PatchAction, string[]> = {
  startDeployment: [
    "Auto-creates successor patch when needed",
    "Locks patch for deployment planning",
  ],
  cancelDeployment: ["Reopens patch for edits"],
  markActive: ["Marks patch as live", "Updates default selections"],
  revertToDeployment: ["Moves patch back to deployment planning"],
  deprecate: ["Marks patch as deprecated"],
  reactivate: ["Returns deprecated patch to active"],
};

export class PatchTransitionPreflightService {
  constructor(
    private readonly db: PrismaClient,
    private readonly statusService: PatchStatusService = new PatchStatusService(
      db,
    ),
  ) {}

  async getPreflight(
    releaseId: string,
    patchId: string,
    action: PatchAction,
  ): Promise<PatchTransitionPreflightDto> {
    const patch = await this.loadPatch(patchId);
    if (!patch) {
      throw new RestError(404, "NOT_FOUND", "Patch not found", { patchId });
    }
    if (patch.versionId !== releaseId) {
      throw new RestError(
        404,
        "NOT_FOUND",
        "Patch does not belong to the release",
        { patchId, releaseId },
      );
    }
    const parsedAction = PatchActionSchema.parse(action);
    const currentStatus = patch.currentStatus ?? "in_development";
    const validation = this.statusService.validateTransition(
      currentStatus,
      parsedAction,
    );
    const history = await this.statusService.getHistory(patchId);
    const historyPreview = mapToPatchTransitionDtos(history).slice(
      -HISTORY_PREVIEW_LIMIT,
    );
    const actionContext = await this.buildActionContext(
      parsedAction,
      patch,
      historyPreview,
    );
    return toPatchTransitionPreflightDto({
      action: parsedAction,
      fromStatus: currentStatus,
      toStatus: validation.targetStatus,
      allowed: validation.allowed,
      blockers: validation.blockers,
      warnings: validation.warnings,
      expectedSideEffects: PATCH_TRANSITION_SIDE_EFFECTS[parsedAction] ?? [],
      patch: {
        id: patch.id,
        name: patch.name,
        currentStatus,
        versionId: patch.versionId,
      },
      historyPreview,
      actionContext,
    });
  }

  private async loadPatch(patchId: string): Promise<PatchRecord | null> {
    return this.db.patch.findUnique({
      where: { id: patchId },
      select: {
        id: true,
        name: true,
        versionId: true,
        createdAt: true,
        currentStatus: true,
      },
    });
  }

  private async buildActionContext(
    action: PatchAction,
    patch: PatchRecord,
    history: PatchTransitionPreflightDto["historyPreview"],
  ): Promise<PatchTransitionActionContext | undefined> {
    switch (action) {
      case "startDeployment": {
        const release = await this.db.releaseVersion.findUnique({
          where: { id: patch.versionId },
          select: { name: true, lastUsedIncrement: true },
        });
        const nextIncrement = (release?.lastUsedIncrement ?? -1) + 1;
        const hasSuccessor =
          (await this.db.patch.findFirst({
            where: {
              versionId: patch.versionId,
              createdAt: { gt: patch.createdAt },
            },
            select: { id: true },
          })) != null;
        return {
          action,
          nextPatchName: `${release?.name ?? patch.name}.${nextIncrement}`,
          missingComponentSelections: 0,
          hasSuccessor,
        };
      }
      case "cancelDeployment":
        return { action };
      case "markActive":
        return {
          action,
          readyForProd: patch.currentStatus === "in_deployment",
          pendingApprovals: [],
        };
      case "revertToDeployment": {
        const activeSince =
          this.findMostRecentStatus(history, "active") ??
          IsoTimestampSchema.parse(patch.createdAt.toISOString());
        return { action, activeSince };
      }
      case "deprecate":
        return { action, consumersImpacted: false };
      case "reactivate": {
        const deprecatedSince =
          this.findMostRecentStatus(history, "deprecated") ??
          IsoTimestampSchema.parse(patch.createdAt.toISOString());
        return { action, deprecatedSince };
      }
      default:
        return undefined;
    }
  }

  private findMostRecentStatus(
    history: PatchTransitionPreflightDto["historyPreview"],
    status: PatchStatus,
  ): ISO8601 | undefined {
    const entry = [...history].reverse().find((h) => h.toStatus === status);
    return entry?.createdAt;
  }
}
