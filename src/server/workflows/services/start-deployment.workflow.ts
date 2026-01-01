import type { PrismaClient } from "@prisma/client";
import type { ActionWorkflowInput, ActionWorkflowService } from "../types";

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
    if (!current) return;

    const release = await this.db.releaseVersion.findUnique({
      where: { id: current.versionId },
      select: { id: true, name: true, lastUsedIncrement: true },
    });
    if (!release) return;

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

    const successor = await this.db.patch.create({
      data: {
        name: successorName,
        version: { connect: { id: release.id } },
        createdBy: { connect: { id: userId } },
        tokenValues: {},
      },
      select: { id: true, name: true },
    });

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
