import type { PrismaClient } from "@prisma/client";
import type {
  BuiltVersionAction as ApiAction,
  BuiltVersionStatus,
} from "~/shared/types/built-version-status";
import type {
  ActionLogger,
  SubactionInput,
} from "~/server/services/action-history.service";

// Local copies of DB enum shapes to avoid Prisma type dependency during lint/type analysis
type DbBuiltVersionAction =
  | "start_deployment"
  | "cancel_deployment"
  | "mark_active"
  | "revert_to_deployment"
  | "deprecate"
  | "reactivate";

type DbBuiltVersionStatus =
  | "in_development"
  | "in_deployment"
  | "active"
  | "deprecated";

// Map API action (camelCase) to DB enum (snake_case)
const ActionToPrisma: Record<ApiAction, DbBuiltVersionAction> = {
  startDeployment: "start_deployment",
  cancelDeployment: "cancel_deployment",
  markActive: "mark_active",
  revertToDeployment: "revert_to_deployment",
  deprecate: "deprecate",
  reactivate: "reactivate",
};

type TransitionRule = {
  from: DbBuiltVersionStatus;
  to: DbBuiltVersionStatus;
};

const Rules = {
  start_deployment: { from: "in_development", to: "in_deployment" },
  cancel_deployment: { from: "in_deployment", to: "in_development" },
  mark_active: { from: "in_deployment", to: "active" },
  revert_to_deployment: { from: "active", to: "in_deployment" },
  deprecate: { from: "active", to: "deprecated" },
  reactivate: { from: "deprecated", to: "active" },
} satisfies Record<DbBuiltVersionAction, TransitionRule>;

export class BuiltVersionStatusService {
  constructor(private readonly db: PrismaClient) {}

  async getHistory(builtVersionId: string) {
    return this.db.builtVersionTransition.findMany({
      where: { builtVersionId },
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

  async getCurrentStatus(builtVersionId: string): Promise<BuiltVersionStatus> {
    const latest = await this.db.builtVersionTransition.findFirst({
      where: { builtVersionId },
      orderBy: { createdAt: "desc" },
      select: { toStatus: true },
    });
    return (latest?.toStatus ?? "in_development") as BuiltVersionStatus;
  }

  async transition(
    builtVersionId: string,
    action: ApiAction,
    userId: string,
    options?: { logger?: ActionLogger },
  ): Promise<{ status: BuiltVersionStatus }>
  {
    const prismaAction = ActionToPrisma[action];
    const rule = Rules[prismaAction];
    if (!rule) {
      throw new Error(`Unsupported action: ${action}`);
    }

    const auditTrail: SubactionInput[] = [];

    const result = await this.db.$transaction(async (tx) => {
      // Ensure BuiltVersion exists
      const builtRecord = await tx.builtVersion.findUniqueOrThrow({
        where: { id: builtVersionId },
        select: { id: true, name: true, versionId: true },
      });
      auditTrail.push({
        subactionType: "builtVersion.transition.verify",
        message: `Transition ${builtRecord.name} via ${prismaAction}`,
        metadata: { builtVersionId, action: prismaAction },
      });

      const current = await tx.builtVersionTransition.findFirst({
        where: { builtVersionId },
        orderBy: { createdAt: "desc" },
        select: { toStatus: true },
      });
      const currentStatus = (current?.toStatus ?? "in_development") as DbBuiltVersionStatus;

      if (currentStatus !== rule.from) {
        // Provide a precise error for clients
        throw Object.assign(new Error(`Invalid transition from ${currentStatus} via ${prismaAction}`), {
          code: "INVALID_TRANSITION",
          details: { from: currentStatus, expected: rule.from, action },
        });
      }

      await tx.builtVersionTransition.create({
        data: {
          builtVersionId,
          fromStatus: rule.from,
          toStatus: rule.to,
          action: prismaAction,
          createdById: userId,
        },
      });
      auditTrail.push({
        subactionType: "builtVersion.transition.persist",
        message: `Recorded transition ${prismaAction}`,
        metadata: { from: rule.from, to: rule.to, builtVersionId },
      });

      // Hook: onEnter. Intentionally placed after write.
      // When entering a new status, perform side effects.
      const onEnter = async (s: DbBuiltVersionStatus) => {
        // When a built version moves to in_deployment, auto-create a successor
        if (s !== "in_deployment") return;
        // Fetch the built version to obtain its release version
        const current = await tx.builtVersion.findUnique({
          where: { id: builtVersionId },
          select: { id: true, name: true, versionId: true, createdAt: true },
        });
        if (!current) return;
        // Get release version for naming + increment tracking
        const release = await tx.releaseVersion.findUnique({
          where: { id: current.versionId },
          select: { id: true, name: true, lastUsedIncrement: true },
        });
        if (!release) return;
        // If there is already a newer built for this release, do NOT create a successor
        const newer = await tx.builtVersion.findFirst({
          where: { versionId: current.versionId, createdAt: { gt: current.createdAt } },
          select: { id: true },
        });
        if (newer) return;
        const nextBuiltIncrement = (release.lastUsedIncrement ?? -1) + 1;
        const successorName = `${release.name}.${nextBuiltIncrement}`;
        // Create successor BuiltVersion with token snapshot
        const successor = await tx.builtVersion.create({
          data: {
            name: successorName,
            version: { connect: { id: release.id } },
            createdBy: { connect: { id: userId } },
            // tokenValues: store tokens actually used for this built-version name
            tokenValues: {},
          },
          select: { id: true, name: true },
        });
        auditTrail.push({
          subactionType: "builtVersion.successor.create",
          message: `Auto-created successor ${successor.name}`,
          metadata: { successorId: successor.id, releaseId: release.id },
        });
        // Update last used increment on the release
        await tx.releaseVersion.update({
          where: { id: release.id },
          data: { lastUsedIncrement: nextBuiltIncrement },
        });
        // Persist token snapshot now that we have final values
        await tx.builtVersion.update({
          where: { id: successor.id },
          data: {
            tokenValues: {
              release_version: release.name,
              increment: nextBuiltIncrement,
            },
          },
        });
        // Do not pre-create ComponentVersions for the successor here.
        // ComponentVersions will now be created/moved during deployment finalization
        // based on user-selected components (see DeploymentService).
      };
      await onEnter(rule.to);

      return { status: rule.to as BuiltVersionStatus };
    });

    if (options?.logger) {
      for (const entry of auditTrail) {
        await options.logger.subaction(entry);
      }
    }

    return result;
  }

  // Convenience explicit methods for improved DX
  startDeployment(builtVersionId: string, userId: string) {
    return this.transition(builtVersionId, "startDeployment", userId);
  }
  cancelDeployment(builtVersionId: string, userId: string) {
    return this.transition(builtVersionId, "cancelDeployment", userId);
  }
  markActive(builtVersionId: string, userId: string) {
    return this.transition(builtVersionId, "markActive", userId);
  }
  revertToDeployment(builtVersionId: string, userId: string) {
    return this.transition(builtVersionId, "revertToDeployment", userId);
  }
  deprecate(builtVersionId: string, userId: string) {
    return this.transition(builtVersionId, "deprecate", userId);
  }
  reactivate(builtVersionId: string, userId: string) {
    return this.transition(builtVersionId, "reactivate", userId);
  }
}
