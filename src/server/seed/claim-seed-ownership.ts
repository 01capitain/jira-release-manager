import type { PrismaClient } from "@prisma/client";

import { db } from "~/server/db";
import { SEED_PLACEHOLDER_USER } from "~/server/seed/constants";

const OwnershipTargets = [
  "releaseComponent",
  "releaseVersion",
  "patch",
  "patchTransition",
  "actionLog",
] as const;

export async function claimSeedOwnership({
  userId,
  prisma = db,
}: {
  userId: string;
  prisma?: PrismaClient;
}): Promise<boolean> {
  if (!userId) {
    throw new Error("Missing userId for claimSeedOwnership");
  }
  if (userId === SEED_PLACEHOLDER_USER.id) {
    return false;
  }

  const claimed = await prisma.$transaction(async (tx) => {
    const placeholder = await tx.user.findUnique({
      where: { id: SEED_PLACEHOLDER_USER.id },
      select: { id: true },
    });
    if (!placeholder) {
      return false;
    }

    const targetUser = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!targetUser) {
      throw new Error(`User ${userId} not found while claiming seed ownership`);
    }

    for (const model of OwnershipTargets) {
      const delegate = tx[model] as unknown as {
        updateMany(args: {
          where: { createdById: string };
          data: { createdById: string };
        }): Promise<unknown>;
      };
      await delegate.updateMany({
        where: { createdById: placeholder.id },
        data: { createdById: userId },
      });
    }

    await tx.user.delete({ where: { id: placeholder.id } });
    return true;
  });

  return claimed;
}
