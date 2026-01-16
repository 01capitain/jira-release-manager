import { PatchTransitionPreflightService } from "~/server/services/patch-transition-preflight.service";
import type { PatchAction } from "~/shared/types/patch-status";

const PATCH_ID = "018f1a50-0000-7000-8000-00000000abcd";
const RELEASE_ID = "018f1a50-0000-7000-8000-00000000abce";
const USER_ID = "018f1a50-0000-7000-8000-00000000abcf";

type MockOptions = {
  currentStatus?: string | null;
  transitions?: any[];
  releaseName?: string;
  lastUsedIncrement?: number;
  hasSuccessor?: boolean;
};

const makeMockDb = (options: MockOptions = {}) => {
  const {
    currentStatus = "in_development",
    transitions = [],
    releaseName = "Version One",
    lastUsedIncrement = 0,
    hasSuccessor = false,
  } = options;
  const createdAt = new Date("2024-01-01T00:00:00Z");
  return {
    patch: {
      findUnique: jest.fn(async () => ({
        id: PATCH_ID,
        name: "Version One.0",
        versionId: RELEASE_ID,
        createdAt,
        currentStatus,
      })),
      findFirst: jest.fn(async () =>
        hasSuccessor
          ? {
              id: "018f1a50-0000-7000-8000-00000000abdc",
            }
          : null,
      ),
    },
    releaseVersion: {
      findUnique: jest.fn(async () => ({
        id: RELEASE_ID,
        name: releaseName,
        lastUsedIncrement,
      })),
      findUniqueOrThrow: jest.fn(async () => ({
        id: RELEASE_ID,
        name: releaseName,
        lastUsedIncrement,
      })),
    },
    patchTransition: {
      findMany: jest.fn(async () => transitions),
    },
  };
};

const buildTransition = (input: {
  id: string;
  action: string;
  fromStatus: string;
  toStatus: string;
  createdAt?: Date;
}) => ({
  ...input,
  patchId: PATCH_ID,
  createdAt: input.createdAt ?? new Date(),
  createdById: USER_ID,
});

describe("PatchTransitionPreflightService", () => {
  test("returns allowed preflight with action context for startDeployment", async () => {
    const transitions = [
      buildTransition({
        id: "018f1a50-0000-7000-8000-00000000ac01",
        action: "startDeployment",
        fromStatus: "in_development",
        toStatus: "in_deployment",
      }),
    ];
    const db = makeMockDb({
      currentStatus: "in_development",
      transitions,
    });
    const service = new PatchTransitionPreflightService(db as any);

    const result = await service.getPreflight(
      RELEASE_ID,
      PATCH_ID,
      "startDeployment",
    );

    expect(result.allowed).toBe(true);
    expect(result.toStatus).toBe("in_deployment");
    expect(result.historyPreview).toHaveLength(1);
    expect(result.historyPreview[0]).toMatchObject({
      action: "startDeployment",
    });
    expect(result.actionContext).toEqual(
      expect.objectContaining({
        action: "startDeployment",
        hasSuccessor: false,
        nextPatchName: "Version One.1",
      }),
    );
    expect(result.expectedSideEffects).not.toHaveLength(0);
  });

  test.each<PatchAction>([
    "markActive",
    "deprecate",
    "reactivate",
    "revertToDeployment",
    "cancelDeployment",
  ])(
    "marks transition as blocked when current status does not allow %s",
    async (action) => {
      const db = makeMockDb({ currentStatus: "in_development" });
      const service = new PatchTransitionPreflightService(db as any);

      const result = await service.getPreflight(RELEASE_ID, PATCH_ID, action);

      expect(result.allowed).toBe(false);
      expect(result.blockers[0]).toContain("expected");
      expect(result.fromStatus).toBe("in_development");
    },
  );

  test("revertToDeployment reports activeSince from history", async () => {
    const transitions = [
      buildTransition({
        id: "018f1a50-0000-7000-8000-00000000ac02",
        action: "markActive",
        fromStatus: "in_deployment",
        toStatus: "active",
        createdAt: new Date("2024-02-01T00:00:00Z"),
      }),
    ];
    const db = makeMockDb({
      currentStatus: "active",
      transitions,
    });
    const service = new PatchTransitionPreflightService(db as any);

    const result = await service.getPreflight(
      RELEASE_ID,
      PATCH_ID,
      "revertToDeployment",
    );

    expect(result.actionContext).toEqual(
      expect.objectContaining({
        action: "revertToDeployment",
        activeSince: "2024-02-01T00:00:00.000Z",
      }),
    );
  });
});
