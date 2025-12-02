import type { PrismaClient } from "@prisma/client";
import type {
  ActionLogger,
  SubactionInput,
} from "~/server/services/action-history.service";
import type {
  PatchAction as ApiAction,
  PatchStatus,
} from "~/shared/types/patch-status";

// Local copies of DB enum shapes to avoid Prisma type dependency during lint/type analysis
type DbPatchAction =
  | "start_deployment"
  | "cancel_deployment"
  | "mark_active"
  | "revert_to_deployment"
  | "deprecate"
  | "reactivate";

type TransitionRule = {
  from: PatchStatus;
  to: PatchStatus;
};

// Map API action (camelCase) to DB enum (snake_case)
const ActionToPrisma: Record<ApiAction, DbPatchAction> = {
  startDeployment: "start_deployment",
  cancelDeployment: "cancel_deployment",
  markActive: "mark_active",
  revertToDeployment: "revert_to_deployment",
  deprecate: "deprecate",
  reactivate: "reactivate",
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
  currentStatus: PatchStatus;
};

export class PatchStatusService {
  constructor(private readonly db: PrismaClient) {}

  getTransitionRule(action: ApiAction): TransitionRule {
    const prismaAction = ActionToPrisma[action];
    const rule = Rules[prismaAction];
    if (!rule) {
      throw new Error(`Unsupported action: ${action}`);
    }
    return {
      from: rule.from,
      to: rule.to,
    };
  }

  validateTransition(
    currentStatus: PatchStatus,
    action: ApiAction,
  ): {
    allowed: boolean;
    blockers: string[];
    warnings: string[];
    targetStatus: PatchStatus;
  } {
    const rule = this.getTransitionRule(action);
    if (currentStatus !== rule.from) {
      return {
        allowed: false,
        blockers: [
          `Patch is currently ${currentStatus}; expected ${rule.from} for ${action}`,
        ],
        warnings: [],
        targetStatus: rule.to,
      };
    }
    return {
      allowed: true,
      blockers: [],
      warnings: [],
      targetStatus: rule.to,
    };
  }

  async getHistory(patchId: string) {
    return this.db.patchTransition.findMany({
      where: { patchId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        patchId: true,
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
    action: ApiAction,
    userId: string,
    options?: { logger?: ActionLogger },
  ): Promise<{
    status: PatchStatus;
    patch: PatchSummary;
    transitionId: string;
  }> {
    const prismaAction = ActionToPrisma[action];
    const rule = Rules[prismaAction];
    const targetRule = this.getTransitionRule(action);

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
        message: `Transition ${patchRecord.name} via ${prismaAction}`,
        metadata: { patchId, action: prismaAction },
      });

      const currentStatus = (patchRecord.currentStatus ??
        "in_development") as PatchStatus;
      const validation = this.validateTransition(currentStatus, action);

      if (!validation.allowed) {
        // Provide a precise error for clients
        throw Object.assign(
          new Error(
            `Invalid transition from ${currentStatus} via ${prismaAction}`,
          ),
          {
            code: "INVALID_TRANSITION",
            details: {
              from: currentStatus,
              expected: rule.from,
              action,
            },
          },
        );
      }

      const transitionRecord = await tx.patchTransition.create({
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

      // Create work item for async/sync processing
      await tx.patchTransitionWork.create({
        data: {
          patchId,
          transitionId: transitionRecord.id,
          action: prismaAction,
          createdById: userId,
        },
      });

      await tx.patch.update({
        where: { id: patchId },
        data: { currentStatus: rule.to },
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
        status: targetRule.to,
        patch,
        transitionId: transitionRecord.id,
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
