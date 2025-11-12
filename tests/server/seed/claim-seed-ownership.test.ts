import type { PrismaClient } from "@prisma/client";

import { claimSeedOwnership } from "~/server/seed/claim-seed-ownership";
import { SEED_PLACEHOLDER_USER } from "~/server/seed/constants";

type MockDelegate = {
  updateMany?: jest.Mock;
  findUnique?: jest.Mock;
  delete?: jest.Mock;
};

const createMockPrisma = () => {
  const mockDelegates = {
    user: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    releaseComponent: { updateMany: jest.fn() },
    releaseVersion: { updateMany: jest.fn() },
    builtVersion: { updateMany: jest.fn() },
    builtVersionTransition: { updateMany: jest.fn() },
    actionLog: { updateMany: jest.fn() },
  };

  const prisma = {
    $transaction: jest.fn(async (cb) => cb(mockDelegates)),
    ...mockDelegates,
  } as unknown as PrismaClient & typeof mockDelegates;

  return { prisma, mockDelegates };
};

describe("claimSeedOwnership", () => {
  const placeholderUser = { id: SEED_PLACEHOLDER_USER.id };
  const targetUser = { id: "018f1a50-0000-7000-9000-000000009999" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns false when the placeholder user no longer exists", async () => {
    const { prisma, mockDelegates } = createMockPrisma();
    mockDelegates.user.findUnique
      .mockResolvedValueOnce(null) // placeholder lookup
      .mockResolvedValueOnce(targetUser); // target (unused)

    const result = await claimSeedOwnership({
      userId: targetUser.id,
      prisma,
    });

    expect(result).toBe(false);
    expect(mockDelegates.releaseComponent.updateMany).not.toHaveBeenCalled();
    expect(mockDelegates.user.delete).not.toHaveBeenCalled();
  });

  it("throws when the target user cannot be found", async () => {
    const { prisma, mockDelegates } = createMockPrisma();
    mockDelegates.user.findUnique
      .mockResolvedValueOnce(placeholderUser) // placeholder exists
      .mockResolvedValueOnce(null); // target missing

    await expect(
      claimSeedOwnership({
        userId: targetUser.id,
        prisma,
      }),
    ).rejects.toThrow(
      `User ${targetUser.id} not found while claiming seed ownership`,
    );

    expect(mockDelegates.releaseComponent.updateMany).not.toHaveBeenCalled();
    expect(mockDelegates.user.delete).not.toHaveBeenCalled();
  });

  it("reassigns all placeholder-owned records and deletes the placeholder user", async () => {
    const { prisma, mockDelegates } = createMockPrisma();
    mockDelegates.user.findUnique
      .mockResolvedValueOnce(placeholderUser) // placeholder lookup
      .mockResolvedValueOnce(targetUser); // target lookup

    const result = await claimSeedOwnership({
      userId: targetUser.id,
      prisma,
    });

    expect(result).toBe(true);
    const targets = [
      mockDelegates.releaseComponent.updateMany,
      mockDelegates.releaseVersion.updateMany,
      mockDelegates.builtVersion.updateMany,
      mockDelegates.builtVersionTransition.updateMany,
      mockDelegates.actionLog.updateMany,
    ];

    for (const delegate of targets) {
      expect(delegate).toHaveBeenCalledWith({
        where: { createdById: placeholderUser.id },
        data: { createdById: targetUser.id },
      });
    }

    expect(mockDelegates.user.delete).toHaveBeenCalledWith({
      where: { id: placeholderUser.id },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
