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

  const db: any = {
    releaseVersion: {
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
    },
    patch: {
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
    },
  };

  return { db, calls } as const;
}

const mockLogger: ActionLogger = {
  id: "log1",
  subaction: jest.fn(),
  complete: jest.fn(),
};

describe("StartDeploymentWorkflowService", () => {
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

    // Release increment updated
    expect(db.releaseVersion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { lastUsedIncrement: 1 },
      }),
    );

    // Logger called
    expect(mockLogger.subaction).toHaveBeenCalled();
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
});
