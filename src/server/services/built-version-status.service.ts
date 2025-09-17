import type { Prisma, PrismaClient, BuiltVersion, User } from "@prisma/client";
import type {
  BuiltVersionAction as ApiAction,
  BuiltVersionStatus,
} from "~/shared/types/built-version-status";

// Map API action (camelCase) to Prisma enum (snake_case)
const ActionToPrisma: Record<ApiAction, Prisma.BuiltVersionAction> = {
  startDeployment: "start_deployment",
  cancelDeployment: "cancel_deployment",
  markActive: "mark_active",
  revertToDeployment: "revert_to_deployment",
  deprecate: "deprecate",
  reactivate: "reactivate",
};

type TransitionRule = {
  from: Prisma.BuiltVersionStatus;
  to: Prisma.BuiltVersionStatus;
};

const Rules = {
  start_deployment: { from: "in_development", to: "in_deployment" },
  cancel_deployment: { from: "in_deployment", to: "in_development" },
  mark_active: { from: "in_deployment", to: "active" },
  revert_to_deployment: { from: "active", to: "in_deployment" },
  deprecate: { from: "active", to: "deprecated" },
  reactivate: { from: "deprecated", to: "active" },
} satisfies Record<Prisma.BuiltVersionAction, TransitionRule>;

export class BuiltVersionStatusService {
  constructor(private readonly db: PrismaClient) {}

  async getHistory(builtVersionId: BuiltVersion["id"]) {
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

  async getCurrentStatus(builtVersionId: BuiltVersion["id"]): Promise<BuiltVersionStatus> {
    const latest = await this.db.builtVersionTransition.findFirst({
      where: { builtVersionId },
      orderBy: { createdAt: "desc" },
      select: { toStatus: true },
    });
    return (latest?.toStatus ?? "in_development") as BuiltVersionStatus;
  }

  async transition(
    builtVersionId: BuiltVersion["id"],
    action: ApiAction,
    userId: User["id"],
  ): Promise<{ status: BuiltVersionStatus }>
  {
    const prismaAction = ActionToPrisma[action];
    const rule = Rules[prismaAction];
    if (!rule) {
      throw new Error(`Unsupported action: ${action}`);
    }

    return this.db.$transaction(async (tx) => {
      // Ensure BuiltVersion exists
      await tx.builtVersion.findUniqueOrThrow({ where: { id: builtVersionId }, select: { id: true } });

      const current = await tx.builtVersionTransition.findFirst({
        where: { builtVersionId },
        orderBy: { createdAt: "desc" },
        select: { toStatus: true },
      });
      const currentStatus = (current?.toStatus ?? "in_development") as Prisma.BuiltVersionStatus;

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

      // Hooks: onExit/onEnter (no-ops for now). Intentionally placed after write.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const onExit = async (_s: Prisma.BuiltVersionStatus) => {};
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const onEnter = async (_s: Prisma.BuiltVersionStatus) => {};
      await onExit(rule.from);
      await onEnter(rule.to);

      return { status: rule.to as BuiltVersionStatus };
    });
  }

  // Convenience explicit methods for improved DX
  startDeployment(builtVersionId: BuiltVersion["id"], userId: User["id"]) {
    return this.transition(builtVersionId, "startDeployment", userId);
  }
  cancelDeployment(builtVersionId: BuiltVersion["id"], userId: User["id"]) {
    return this.transition(builtVersionId, "cancelDeployment", userId);
  }
  markActive(builtVersionId: BuiltVersion["id"], userId: User["id"]) {
    return this.transition(builtVersionId, "markActive", userId);
  }
  revertToDeployment(builtVersionId: BuiltVersion["id"], userId: User["id"]) {
    return this.transition(builtVersionId, "revertToDeployment", userId);
  }
  deprecate(builtVersionId: BuiltVersion["id"], userId: User["id"]) {
    return this.transition(builtVersionId, "deprecate", userId);
  }
  reactivate(builtVersionId: BuiltVersion["id"], userId: User["id"]) {
    return this.transition(builtVersionId, "reactivate", userId);
  }
}
