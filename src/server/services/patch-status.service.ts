import type { PrismaClient } from "@prisma/client";
import type {
  PatchAction as ApiAction,
  PatchStatus,
} from "~/shared/types/patch-status";
import type {
  ActionLogger,
  SubactionInput,
} from "~/server/services/action-history.service";

// Local copies of DB enum shapes to avoid Prisma type dependency during lint/type analysis
type DbPatchAction =
  | "start_deployment"
  | "cancel_deployment"
  | "mark_active"
  | "revert_to_deployment"
  | "deprecate"
  | "reactivate";

type DbPatchStatus =
  | "in_development"
  | "in_deployment"
  | "active"
  | "deprecated";

// Map API action (camelCase) to DB enum (snake_case)
const ActionToPrisma: Record<ApiAction, DbPatchAction> = {
  startDeployment: "start_deployment",
  cancelDeployment: "cancel_deployment",
  markActive: "mark_active",
  revertToDeployment: "revert_to_deployment",
  deprecate: "deprecate",
  reactivate: "reactivate",
};

type TransitionRule = {
  from: DbPatchStatus;
  to: DbPatchStatus;
};

const Rules = {
  start_deployment: { from: "in_development", to: "in_deployment" },
  cancel_deployment: { from: "in_deployment", to: "in_development" },
  mark_active: { from: "in_deployment", to: "active" },
  revert_to_deployment: { from: "active", to: "in_deployment" },
  deprecate: { from: "active", to: "deprecated" },
  reactivate: { from: "deprecated", to: "active" },
} satisfies Record<DbPatchAction, TransitionRule>;

type PatchSummary = {
  id: string;
  name: string;
  versionId: string;
  createdAt: Date;
};

export class PatchStatusService {
  constructor(private readonly db: PrismaClient) {}

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
    const latest = await this.db.patchTransition.findFirst({
      where: { patchId },
      orderBy: { createdAt: "desc" },
      select: { toStatus: true },
    });
    return (latest?.toStatus ?? "in_development") as PatchStatus;
  }

  async transition(
    patchId: string,
    action: ApiAction,
    userId: string,
    options?: { logger?: ActionLogger },
  ): Promise<{
    status: PatchStatus;
    patch: PatchSummary;
  }> {
    const prismaAction = ActionToPrisma[action];
    const rule = Rules[prismaAction];
    if (!rule) {
      throw new Error(`Unsupported action: ${action}`);
    }

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
        },
      });
      auditTrail.push({
        subactionType: "patch.transition.verify",
        message: `Transition ${patchRecord.name} via ${prismaAction}`,
        metadata: { patchId, action: prismaAction },
      });

      const current = await tx.patchTransition.findFirst({
        where: { patchId },
        orderBy: { createdAt: "desc" },
        select: { toStatus: true },
      });
      const currentStatus = (current?.toStatus ??
        "in_development") as DbPatchStatus;

      if (currentStatus !== rule.from) {
        // Provide a precise error for clients
        throw Object.assign(
          new Error(
            `Invalid transition from ${currentStatus} via ${prismaAction}`,
          ),
          {
            code: "INVALID_TRANSITION",
            details: { from: currentStatus, expected: rule.from, action },
          },
        );
      }

      await tx.patchTransition.create({
        data: {
          patchId,
          fromStatus: rule.from,
          toStatus: rule.to,
          action: prismaAction,
          createdById: userId,
        },
      });
      auditTrail.push({
        subactionType: "patch.transition.persist",
        message: `Recorded transition ${prismaAction}`,
        metadata: { from: rule.from, to: rule.to, patchId },
      });

      // Hook: onEnter. Intentionally placed after write.
      // When entering a new status, perform side effects.
      const onEnter = async (s: DbPatchStatus) => {
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
      await onEnter(rule.to);

      const patch = await tx.patch.findUnique({
        where: { id: patchId },
        select: {
          id: true,
          name: true,
          versionId: true,
          createdAt: true,
        },
      });
      if (!patch) {
        throw new Error(
          `Patch ${patchId} missing after transition persistence`,
        );
      }

      return {
        status: rule.to as PatchStatus,
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
