import { Prisma, type PrismaClient } from "@prisma/client";
import type { ActionWorkflowInput, ActionWorkflowService } from "../types";

const isUniqueConstraintError = (error: unknown): boolean => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return true;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  ) {
    return true;
  }
  return false;
};

export class StartDeploymentWorkflowService implements ActionWorkflowService {
  constructor(private readonly db: PrismaClient) {}

  async execute({ patchId, userId, logger }: ActionWorkflowInput) {
    await logger.subaction({
      subactionType: "patch.workflow.startDeployment.checkSuccessor",
      message: "Checking for successor patch",
      metadata: { patchId },
    });

    const current = await this.db.patch.findUnique({
      where: { id: patchId },
      select: { id: true, name: true, versionId: true, createdAt: true },
    });
    if (!current) {
      await logger.subaction({
        subactionType: "patch.workflow.startDeployment.missingPatch",
        message: "Aborting: patch not found",
        metadata: { patchId },
      });
      return;
    }

    const release = await this.db.releaseVersion.findUnique({
      where: { id: current.versionId },
      select: { id: true, name: true, lastUsedIncrement: true },
    });
    if (!release) {
      await logger.subaction({
        subactionType: "patch.workflow.startDeployment.missingRelease",
        message: "Aborting: release not found",
        metadata: { patchId, releaseId: current.versionId },
      });
      return;
    }

    const newer = await this.db.patch.findFirst({
      where: {
        versionId: current.versionId,
        createdAt: { gt: current.createdAt },
      },
      select: { id: true },
    });

    if (newer) {
      await logger.subaction({
        subactionType: "patch.workflow.startDeployment.successorExists",
        message: "Successor patch already exists, skipping creation",
        metadata: { patchId, newerPatchId: newer.id },
      });
      return;
    }

    const nextPatchIncrement = (release.lastUsedIncrement ?? -1) + 1;
    const successorName = `${release.name}.${nextPatchIncrement}`;

    const successor = await this.db.patch
      .create({
        data: {
          name: successorName,
          increment: nextPatchIncrement,
          version: { connect: { id: release.id } },
          createdBy: { connect: { id: userId } },
          tokenValues: {},
        },
        select: { id: true, name: true },
      })
      .catch(async (error: unknown) => {
        if (isUniqueConstraintError(error)) {
          await logger.subaction({
            subactionType: "patch.workflow.startDeployment.successorExists",
            message: "Successor patch already exists, skipping creation",
            metadata: { patchId, releaseId: release.id },
          });
          return null;
        }
        throw error;
      });

    if (!successor) {
      return;
    }

    await logger.subaction({
      subactionType: "patch.successor.create",
      message: `Auto-created successor ${successor.name}`,
      metadata: { successorId: successor.id, releaseId: release.id },
    });

    await this.db.releaseVersion.update({
      where: { id: release.id },
      data: { lastUsedIncrement: nextPatchIncrement },
    });

    await this.db.patch.update({
      where: { id: successor.id },
      data: {
        tokenValues: {
          release_version: release.name,
          increment: nextPatchIncrement,
        },
      },
    });
  }
}
