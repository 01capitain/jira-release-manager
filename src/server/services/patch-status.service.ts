import type { Prisma, PrismaClient } from "@prisma/client";
import type { PatchAction, PatchStatus } from "~/shared/types/patch-status";
import type {
  ActionLogger,
  SubactionInput,
} from "~/server/services/action-history.service";
import { ValidatePatchTransitionService } from "./validate-patch-transition.service";

type DbPatchTransitionAction =
  Prisma.PatchTransitionUncheckedCreateInput["action"];

type PatchSummary = {
  id: string;
  name: string;
  versionId: string;
  createdAt: Date;
  currentStatus: PatchStatus;
};

export class PatchStatusService {
  constructor(
    private readonly db: PrismaClient,
    private readonly validator = new ValidatePatchTransitionService(),
  ) {}

  async getHistory(patchId: string) {
    return this.db.patchTransition.findMany({
      where: { patchId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        fromStatus: true,
        toStatus: true,
        action: true,
        createdAt: true,
        createdById: true,
      },
    });
  }

  async getCurrentStatus(patchId: string): Promise<PatchStatus> {
    const patch = await this.db.patch.findUnique({
      where: { id: patchId },
      select: { currentStatus: true },
    });
    return (patch?.currentStatus ?? "in_development") as PatchStatus;
  }

  async transition(
    patchId: string,
    action: PatchAction,
    userId: string,
    options?: { logger?: ActionLogger },
  ): Promise<{
    status: PatchStatus;
    patch: PatchSummary;
  }> {
    const rule = this.validator.getRule(action);

    const auditTrail: SubactionInput[] = [];

    const result = await this.db.$transaction(async (tx) => {
      // Ensure Patch exists
      const patchRecord = await tx.patch.findUniqueOrThrow({
        where: { id: patchId },
        select: {
          id: true,
          name: true,
          versionId: true,
          createdAt: true,
          currentStatus: true,
        },
      });
      auditTrail.push({
        subactionType: "patch.transition.verify",
        message: `Transition ${patchRecord.name} via ${action}`,
        metadata: { patchId, action },
      });

      const currentStatus = patchRecord.currentStatus ?? "in_development";

      if (currentStatus !== rule.fromStatus) {
        // Provide a precise error for clients
        throw Object.assign(
          new Error(`Invalid transition from ${currentStatus} via ${action}`),
          {
            code: "INVALID_TRANSITION",
            details: {
              from: currentStatus,
              expected: rule.fromStatus,
              action,
            },
          },
        );
      }

      await tx.patchTransition.create({
        data: {
          patchId,
          fromStatus: rule.fromStatus,
          toStatus: rule.toStatus,
          action: action as unknown as DbPatchTransitionAction,
          createdById: userId,
        },
      });
      auditTrail.push({
        subactionType: "patch.transition.persist",
        message: `Recorded transition ${action}`,
        metadata: { from: rule.fromStatus, to: rule.toStatus, patchId },
      });

      // Hook: onEnter. Intentionally placed after write.
      // When entering a new status, perform side effects.
      const onEnter = async (s: PatchStatus) => {
        // When a patch moves to in_deployment, auto-create a successor
        if (s !== "in_deployment") return;
        // Fetch the patch to obtain its release version
        const current = await tx.patch.findUnique({
          where: { id: patchId },
          select: { id: true, name: true, versionId: true, createdAt: true },
        });
        if (!current) return;
        // Get release version for naming + increment tracking
        const release = await tx.releaseVersion.findUnique({
          where: { id: current.versionId },
          select: { id: true, name: true, lastUsedIncrement: true },
        });
        if (!release) return;
        // If there is already a newer patch for this release, do NOT create a successor
        const newer = await tx.patch.findFirst({
          where: {
            versionId: current.versionId,
            createdAt: { gt: current.createdAt },
          },
          select: { id: true },
        });
        if (newer) return;
        const nextPatchIncrement = (release.lastUsedIncrement ?? -1) + 1;
        const successorName = `${release.name}.${nextPatchIncrement}`;
        // Create successor Patch with token snapshot
        const successor = await tx.patch.create({
          data: {
            name: successorName,
            version: { connect: { id: release.id } },
            createdBy: { connect: { id: userId } },
            // tokenValues: store tokens actually used for this patch name
            tokenValues: {},
          },
          select: { id: true, name: true },
        });
        auditTrail.push({
          subactionType: "patch.successor.create",
          message: `Auto-created successor ${successor.name}`,
          metadata: { successorId: successor.id, releaseId: release.id },
        });
        // Update last used increment on the release
        await tx.releaseVersion.update({
          where: { id: release.id },
          data: { lastUsedIncrement: nextPatchIncrement },
        });
        // Persist token snapshot now that we have final values
        await tx.patch.update({
          where: { id: successor.id },
          data: {
            tokenValues: {
              release_version: release.name,
              increment: nextPatchIncrement,
            },
          },
        });
        // Do not pre-create ComponentVersions for the successor here.
        // ComponentVersions will now be created/moved during deployment finalization
        // based on user-selected components (see DeploymentService).
      };
      await onEnter(rule.toStatus);

      await tx.patch.update({
        where: { id: patchId },
        data: { currentStatus: rule.toStatus },
      });

      const patch = await tx.patch.findUniqueOrThrow({
        where: { id: patchId },
        select: {
          id: true,
          name: true,
          versionId: true,
          createdAt: true,
          currentStatus: true,
        },
      });

      return {
        status: rule.toStatus,
        patch,
      };
    });

    if (options?.logger) {
      for (const entry of auditTrail) {
        try {
          await options.logger.subaction(entry);
        } catch (error) {
          // Absorb logging failures to prevent breaking the transition workflow
          console.error("Failed to log subaction:", error);
        }
      }
    }

    return result;
  }

  // Convenience explicit methods for improved DX
  startDeployment(patchId: string, userId: string) {
    return this.transition(patchId, "startDeployment", userId);
  }
  cancelDeployment(patchId: string, userId: string) {
    return this.transition(patchId, "cancelDeployment", userId);
  }
  markActive(patchId: string, userId: string) {
    return this.transition(patchId, "markActive", userId);
  }
  revertToDeployment(patchId: string, userId: string) {
    return this.transition(patchId, "revertToDeployment", userId);
  }
  deprecate(patchId: string, userId: string) {
    return this.transition(patchId, "deprecate", userId);
  }
  reactivate(patchId: string, userId: string) {
    return this.transition(patchId, "reactivate", userId);
  }
}
