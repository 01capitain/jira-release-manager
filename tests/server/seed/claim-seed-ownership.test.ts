import type { PrismaClient } from "@prisma/client";

import { claimSeedOwnership } from "~/server/seed/claim-seed-ownership";
import { SEED_PLACEHOLDER_USER } from "~/server/seed/constants";

const createMockPrisma = () => {
  const mockDelegates = {
    user: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    releaseComponent: { updateMany: jest.fn() },
    releaseVersion: { updateMany: jest.fn() },
    patch: { updateMany: jest.fn() },
    patchTransition: { updateMany: jest.fn() },
    actionLog: { updateMany: jest.fn() },
  };

  const transactionSpy = jest.fn(async (cb) => cb(mockDelegates));
  const prisma = {
    $transaction: transactionSpy,
    ...mockDelegates,
  } as unknown as PrismaClient & typeof mockDelegates;

  return { prisma, mockDelegates, transactionSpy };
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
    const { prisma, mockDelegates, transactionSpy } = createMockPrisma();
    mockDelegates.user.findUnique
      .mockResolvedValueOnce(placeholderUser) // placeholder lookup
      .mockResolvedValueOnce(targetUser); // target lookup

    const result = await claimSeedOwnership({
      userId: targetUser.id,
      prisma,
    });

    expect(result).toBe(true);
    expect(mockDelegates.releaseComponent.updateMany).toHaveBeenCalledWith({
      where: { createdById: placeholderUser.id },
      data: { createdById: targetUser.id },
    });
    expect(mockDelegates.releaseVersion.updateMany).toHaveBeenCalledWith({
      where: { createdById: placeholderUser.id },
      data: { createdById: targetUser.id },
    });
    expect(mockDelegates.patch.updateMany).toHaveBeenCalledWith({
      where: { createdById: placeholderUser.id },
      data: { createdById: targetUser.id },
    });
    expect(
      mockDelegates.patchTransition.updateMany,
    ).toHaveBeenCalledWith({
      where: { createdById: placeholderUser.id },
      data: { createdById: targetUser.id },
    });
    expect(mockDelegates.actionLog.updateMany).toHaveBeenCalledWith({
      where: { createdById: placeholderUser.id },
      data: { createdById: targetUser.id },
    });

    expect(mockDelegates.user.delete).toHaveBeenCalledWith({
      where: { id: placeholderUser.id },
    });
    expect(transactionSpy).toHaveBeenCalledTimes(1);
  });
});
