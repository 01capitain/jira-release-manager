import { releaseComponentFixtures } from "../fixtures/release-components";
import { SuccessorPatchService } from "~/server/services/successor-patch.service";

type CV = {
  id: string;
  releaseComponentId: string;
  patchId: string;
  name: string;
  increment: number;
  tokenValues?: any;
};

function setupMockDb({
  components,
  currentPatchName,
  successorPatchName,
  seedOnCurrent = true,
}: {
  components: {
    id: string;
    namingPattern: string;
    releaseScope: "global" | "version_bound";
  }[];
  currentPatchName: string;
  successorPatchName: string;
  seedOnCurrent?: boolean;
}) {
  const REL_ID = "00000000-0000-7000-8000-000000000021";
  const PATCH_X = "00000000-0000-7000-8000-000000000022";
  const PATCH_Y = "00000000-0000-7000-8000-000000000023"; // successor

  const patches = [
    {
      id: PATCH_X,
      name: currentPatchName,
      versionId: REL_ID,
      createdAt: new Date("2024-01-01T00:00:00Z"),
    },
    {
      id: PATCH_Y,
      name: successorPatchName,
      versionId: REL_ID,
      createdAt: new Date("2024-01-02T00:00:00Z"),
    },
  ];
  const componentVersions: CV[] = [];
  let cvAuto = 0;

  if (seedOnCurrent) {
    for (const c of components) {
      componentVersions.push({
        id: `cv-${++cvAuto}`,
        releaseComponentId: c.id,
        patchId: PATCH_X,
        name: `${currentPatchName}-${c.id}-0`,
        increment: 0,
      });
    }
  }

  const db: any = {
    $transaction: async (fn: (tx: any) => Promise<any>) => fn(db),
    // release
    releaseVersion: {
      findUniqueOrThrow: jest.fn(async () => ({
        id: REL_ID,
        name: currentPatchName.split(".")[0],
      })),
    },
    // patch
    patch: {
      findUniqueOrThrow: jest.fn(
        async (args: any) => patches.find((b) => b.id === args.where.id)!,
      ),
      findFirst: jest.fn(async (args: any) => {
        const { versionId, createdAt } = args.where;
        const gt = createdAt.gt as Date;
        const candidates = patches.filter(
          (b) => b.versionId === versionId && b.createdAt > gt,
        );
        if (candidates.length === 0) return null;
        candidates.sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        );
        return candidates[0];
      }),
    },
    // comps
    releaseComponent: {
      findMany: jest.fn(async () => components),
    },
    componentVersion: {
      findMany: jest.fn(async (args: any) => {
        if (args.where?.patchId) {
          const id = args.where.patchId;
          return componentVersions.filter((cv) => cv.patchId === id);
        }
        return componentVersions;
      }),
      upsert: jest.fn(async (args: any) => {
        const where = args.where?.patchId_releaseComponentId;
        if (!where)
          throw new Error(
            "mock upsert expects patchId_releaseComponentId",
          );
        const idx = componentVersions.findIndex(
          (cv) =>
            cv.patchId === where.patchId &&
            cv.releaseComponentId === where.releaseComponentId,
        );
        if (idx >= 0) {
          const existing = componentVersions[idx];
          if (!existing) {
            throw new Error("expected component version to exist");
          }
          const updated = { ...existing, ...(args.update ?? {}) };
          componentVersions[idx] = updated;
          return args.select
            ? { id: updated.id, increment: updated.increment }
            : updated;
        }
        const created: CV = {
          id: `cv-${++cvAuto}`,
          releaseComponentId: args.create.releaseComponent.connect.id,
          patchId: args.create.patch.connect.id,
          name: args.create.name,
          increment: args.create.increment,
          tokenValues: args.create.tokenValues,
        };
        componentVersions.push(created);
        return args.select
          ? { id: created.id, increment: created.increment }
          : created;
      }),
      create: jest.fn(async (args: any) => {
        const row: CV = {
          id: `cv-${++cvAuto}`,
          releaseComponentId: args.data.releaseComponent.connect.id,
          patchId: args.data.patch.connect.id,
          name: args.data.name,
          increment: args.data.increment,
          tokenValues: args.data.tokenValues,
        };
        componentVersions.push(row);
        return row;
      }),
      update: jest.fn(async (args: any) => {
        const idx = componentVersions.findIndex(
          (cv) => cv.id === args.where.id,
        );
        if (idx >= 0) {
          const current = componentVersions[idx];
          if (!current) {
            throw new Error("component version not found");
          }
          const next = { ...current, ...args.data };
          componentVersions[idx] = next;
          return next;
        }
        throw new Error("not found");
      }),
      delete: jest.fn(async (args: any) => {
        const idx = componentVersions.findIndex(
          (cv) => cv.id === args.where.id,
        );
        if (idx >= 0) {
          const [removed] = componentVersions.splice(idx, 1);
          return removed ?? { id: args.where.id };
        }
        throw new Error("not found");
      }),
    },
    patchTransition: {
      findFirst: jest.fn(async () => ({ toStatus: "in_deployment" })),
    },
  };

  return { db, ids: { REL_ID, PATCH_X, PATCH_Y }, componentVersions } as const;
}

describe("SuccessorPatchService.createSuccessorPatch", () => {
  const comps: {
    id: string;
    namingPattern: string;
    releaseScope: "global" | "version_bound";
  }[] = [
    releaseComponentFixtures.iosApp,
    releaseComponentFixtures.desktopAngular,
    releaseComponentFixtures.phpBackend,
  ].map((fixture) => ({
    id: fixture.id,
    namingPattern: fixture.namingPattern,
    releaseScope:
      fixture.releaseScope === "version-bound" ? "version_bound" : "global",
  }));

  test("selecting all keeps rows on current and seeds successor", async () => {
    const { db, ids, componentVersions } = setupMockDb({
      components: comps,
      currentPatchName: "version 1.0",
      successorPatchName: "version 1.1",
    });
    const svc = new SuccessorPatchService(db);
    const summary = await svc.createSuccessorPatch(
      ids.PATCH_X as any,
      comps.map((c) => c.id),
      "user-1" as any,
    );
    const onX = componentVersions.filter(
      (cv) => cv.patchId === ids.PATCH_X,
    );
    const onY = componentVersions.filter(
      (cv) => cv.patchId === ids.PATCH_Y,
    );
    const expectedIds = comps.map((c) => c.id).sort();
    expect(onX.map((r) => r.releaseComponentId).sort()).toEqual(expectedIds);
    expect(onY.map((r) => r.releaseComponentId).sort()).toEqual(expectedIds);
    expect(summary).toMatchObject({
      created: comps.length,
      updated: 0,
      moved: 0,
      successorPatchId: ids.PATCH_Y,
    });
  });

  test("unselected move to successor; selected remain and seed successor", async () => {
    const { db, ids, componentVersions } = setupMockDb({
      components: comps,
      currentPatchName: "version 1.0",
      successorPatchName: "version 1.1",
    });
    const svc = new SuccessorPatchService(db);
    await svc.createSuccessorPatch(
      ids.PATCH_X as any,
      comps.filter((c) => c.releaseScope === "global").map((c) => c.id),
      "user-1" as any,
    );
    const onX = componentVersions.filter(
      (cv) => cv.patchId === ids.PATCH_X,
    );
    const onY = componentVersions.filter(
      (cv) => cv.patchId === ids.PATCH_Y,
    );
    // current (closed): only A and C
    const globalIds = comps
      .filter((c) => c.releaseScope === "global")
      .map((c) => c.id)
      .sort();
    const versionBoundIds = comps
      .filter((c) => c.releaseScope === "version_bound")
      .map((c) => c.id)
      .sort();
    expect(onX.map((r) => r.releaseComponentId).sort()).toEqual(globalIds);
    // successor: moved B and seeded A,C
    expect(onY.map((r) => r.releaseComponentId).sort()).toEqual(
      [...globalIds, ...versionBoundIds].sort(),
    );
  });

  test("global components stay selected even when omitted", async () => {
    const { db, ids, componentVersions } = setupMockDb({
      components: comps,
      currentPatchName: "version 2.0",
      successorPatchName: "version 2.1",
    });
    const svc = new SuccessorPatchService(db);
    await svc.createSuccessorPatch(
      ids.PATCH_X as any,
      comps.filter((c) => c.releaseScope === "version_bound").map((c) => c.id),
      "user-2" as any,
    );

    const onX = componentVersions
      .filter((cv) => cv.patchId === ids.PATCH_X)
      .map((cv) => cv.releaseComponentId)
      .sort();
    const onY = componentVersions
      .filter((cv) => cv.patchId === ids.PATCH_Y)
      .map((cv) => cv.releaseComponentId)
      .sort();

    const expectedIds = comps.map((c) => c.id).sort();
    expect(onX).toEqual(expectedIds);
    expect(onY).toEqual(expectedIds);
  });

  test("validation: at least one component must be selected", async () => {
    const { db, ids } = setupMockDb({
      components: comps,
      currentPatchName: "version 1.0",
      successorPatchName: "version 1.1",
    });
    const svc = new SuccessorPatchService(db);
    await expect(
      svc.createSuccessorPatch(ids.PATCH_X as any, [], "user-1" as any),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
