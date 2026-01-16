import { type ActionLogger } from "~/server/services/action-history.service";
import { StartDeploymentWorkflowService } from "~/server/workflows/services/start-deployment.workflow";
import { releaseVersionFixtures } from "../../../fixtures/release-versions";
import { userFixtures } from "../../../fixtures/users";

const REL_MAIN_ID = releaseVersionFixtures.version177.id;
const PATCH_LIST_ID = "018f1a50-0000-7000-8000-00000000000e";
const NEWER_PATCH_ID = "018f1a50-0000-7000-8000-000000000010";
const USER_1_ID = userFixtures.adamScott.id;

// Minimal Prisma-like client mock with only fields used in tests
function makeMockDb() {
  const calls: Record<string, unknown[]> = {};
  const record = (key: string, payload: unknown) => {
    calls[key] = calls[key] ?? [];
    calls[key].push(payload);
  };

  const REL_ID = REL_MAIN_ID;
  let patchAutoInc = 0;
  const makeUuid = (n: number) => {
    const hex = n.toString(16).padStart(12, "0");
    return `00000000-0000-7000-8000-${hex}`;
  };

  const releaseVersion = {
    update: jest.fn(async (args: any) => {
      record("releaseVersion.update", args);
      return { id: args.where.id };
    }),
    findUnique: jest.fn(async (args: any = {}) => ({
      id: args?.where?.id ?? REL_ID,
      name: "version 100.0",
      versionId: REL_ID,
      createdAt: new Date(),
      lastUsedIncrement: 0,
    })),
  };
  const patchDelegate = {
    create: jest.fn(async (args: any) => {
      record("patch.create", args);
      const id = makeUuid(++patchAutoInc);
      return {
        id,
        name: args.data.name,
        versionId: args.data.version?.connect?.id ?? REL_ID,
        currentStatus: "in_development",
        createdAt: new Date(),
      };
    }),
    update: jest.fn(async (args: any) => {
      record("patch.update", args);
      return { id: args.where.id, ...args.data };
    }),
    findUnique: jest.fn(async (args: any) => ({
      id: args.where.id,
      name: "version 300.0",
      versionId: REL_ID,
      createdAt: new Date("2024-01-01T00:00:00Z"),
    })),
    findFirst: jest.fn(),
  };

  const db: any = {
    releaseVersion,
    patch: patchDelegate,
  };

  db.$transaction = jest.fn(async (callback: any) =>
    callback({
      patch: patchDelegate,
      releaseVersion,
    }),
  );

  return { db, calls } as const;
}

const mockLogger: ActionLogger = {
  id: "log1",
  subaction: jest.fn(),
  complete: jest.fn(),
};

describe("StartDeploymentWorkflowService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("creates successor with higher increment", async () => {
    const { db, calls } = makeMockDb();
    const service = new StartDeploymentWorkflowService(db);

    await service.execute({
      patchId: PATCH_LIST_ID,
      userId: USER_1_ID,
      transitionId: "t1",
      logger: mockLogger,
    });

    // Successor created
    const successorCalls = calls["patch.create"] ?? [];
    expect(successorCalls).toHaveLength(1);
    const succ = successorCalls[0] as any;
    expect(succ.data.name).toBe("version 100.0.1"); // Based on mock release name "version 100.0" and increment 0 -> 1
    expect(succ.data.increment).toBe(1);

    // Release increment updated
    expect(db.releaseVersion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { lastUsedIncrement: 1 },
      }),
    );

    // Logger called
    expect(mockLogger.subaction).toHaveBeenCalled();
  });

  test("logs and exits when unique constraint prevents successor creation", async () => {
    const { db } = makeMockDb();
    db.patch.create = jest.fn(async () => {
      const error = new Error("P2002");
      (error as { code?: string }).code = "P2002";
      throw error;
    });

    const service = new StartDeploymentWorkflowService(db);
    await service.execute({
      patchId: PATCH_LIST_ID,
      userId: USER_1_ID,
      transitionId: "t1",
      logger: mockLogger,
    });

    expect(db.releaseVersion.update).not.toHaveBeenCalled();
    expect(mockLogger.subaction).toHaveBeenCalledWith(
      expect.objectContaining({
        subactionType: "patch.workflow.startDeployment.successorExists",
        message: "Successor patch already exists, skipping creation",
      }),
    );
  });

  test("skips creation if newer patch exists", async () => {
    const { db } = makeMockDb();
    db.patch.findFirst = jest.fn(async () => ({ id: NEWER_PATCH_ID }));

    const service = new StartDeploymentWorkflowService(db);
    await service.execute({
      patchId: PATCH_LIST_ID,
      userId: USER_1_ID,
      transitionId: "t1",
      logger: mockLogger,
    });

    expect(db.patch.create).not.toHaveBeenCalled();
    expect(mockLogger.subaction).toHaveBeenCalledWith(
      expect.objectContaining({
        subactionType: "patch.workflow.startDeployment.successorExists",
      }),
    );
  });

  test("logs and exits when patch cannot be found", async () => {
    const { db } = makeMockDb();
    db.patch.findUnique = jest.fn(async () => null);

    const service = new StartDeploymentWorkflowService(db);
    await service.execute({
      patchId: PATCH_LIST_ID,
      userId: USER_1_ID,
      transitionId: "t1",
      logger: mockLogger,
    });

    expect(db.patch.create).not.toHaveBeenCalled();
    expect(db.releaseVersion.update).not.toHaveBeenCalled();
    expect(mockLogger.subaction).toHaveBeenCalledWith(
      expect.objectContaining({
        subactionType: "patch.workflow.startDeployment.missingPatch",
        metadata: { patchId: PATCH_LIST_ID },
      }),
    );
  });

  test("logs and exits when release version cannot be found", async () => {
    const { db } = makeMockDb();
    db.releaseVersion.findUnique = jest.fn(async () => null);

    const service = new StartDeploymentWorkflowService(db);
    await service.execute({
      patchId: PATCH_LIST_ID,
      userId: USER_1_ID,
      transitionId: "t1",
      logger: mockLogger,
    });

    expect(db.patch.create).not.toHaveBeenCalled();
    expect(db.releaseVersion.update).not.toHaveBeenCalled();
    expect(mockLogger.subaction).toHaveBeenCalledWith(
      expect.objectContaining({
        subactionType: "patch.workflow.startDeployment.missingRelease",
        metadata: { patchId: PATCH_LIST_ID, releaseId: expect.any(String) },
      }),
    );
  });

  test("bubbles errors if successor creation fails unexpectedly", async () => {
    const { db } = makeMockDb();
    const failure = new Error("database offline");
    db.patch.create = jest.fn(async () => {
      throw failure;
    });

    const service = new StartDeploymentWorkflowService(db);
    await expect(
      service.execute({
        patchId: PATCH_LIST_ID,
        userId: USER_1_ID,
        transitionId: "t1",
        logger: mockLogger,
      }),
    ).rejects.toThrow("database offline");

    expect(db.releaseVersion.update).not.toHaveBeenCalled();
    expect(db.patch.update).not.toHaveBeenCalled();
  });

  test("rolls back when release increment update fails", async () => {
    const { db } = makeMockDb();
    db.releaseVersion.update = jest.fn(async () => {
      throw new Error("increment update failed");
    });

    const service = new StartDeploymentWorkflowService(db);
    await expect(
      service.execute({
        patchId: PATCH_LIST_ID,
        userId: USER_1_ID,
        transitionId: "t1",
        logger: mockLogger,
      }),
    ).rejects.toThrow("increment update failed");

    expect(db.patch.update).not.toHaveBeenCalled();
    expect(mockLogger.subaction).not.toHaveBeenCalledWith(
      expect.objectContaining({
        subactionType: "patch.successor.create",
      }),
    );
  });
});
