import { SuccessorBuiltService } from "~/server/services/successor-built.service";

type CV = {
  id: string;
  releaseComponentId: string;
  builtVersionId: string;
  name: string;
  increment: number;
  tokenValues?: any;
};

function makeUuid(n: number) {
  const hex = n.toString(16).padStart(12, "0");
  return `00000000-0000-0000-0000-${hex}`;
}

function setupMockDb({
  components,
  currentBuiltName,
  successorBuiltName,
  seedOnCurrent = true,
}: {
  components: { id: string; namingPattern: string }[];
  currentBuiltName: string;
  successorBuiltName: string;
  seedOnCurrent?: boolean;
}) {
  const REL_ID = "11111111-1111-1111-1111-111111111111";
  const BUILT_X = "22222222-2222-2222-2222-222222222222";
  const BUILT_Y = "33333333-3333-3333-3333-333333333333"; // successor

  const builtVersions = [
    { id: BUILT_X, name: currentBuiltName, versionId: REL_ID, createdAt: new Date("2024-01-01T00:00:00Z") },
    { id: BUILT_Y, name: successorBuiltName, versionId: REL_ID, createdAt: new Date("2024-01-02T00:00:00Z") },
  ];
  const componentVersions: CV[] = [];
  let cvAuto = 0;

  if (seedOnCurrent) {
    for (const c of components) {
      componentVersions.push({
        id: `cv-${++cvAuto}`,
        releaseComponentId: c.id,
        builtVersionId: BUILT_X,
        name: `${currentBuiltName}-${c.id}-0`,
        increment: 0,
      });
    }
  }

  const db: any = {
    $transaction: async (fn: (tx: any) => Promise<any>) => fn(db),
    // release
    releaseVersion: {
      findUniqueOrThrow: jest.fn(async () => ({ id: REL_ID, name: currentBuiltName.split(".")[0] })),
    },
    // built
    builtVersion: {
      findUniqueOrThrow: jest.fn(async (args: any) => builtVersions.find((b) => b.id === args.where.id)!),
      findFirst: jest.fn(async (args: any) => {
        const { versionId, createdAt } = args.where;
        const gt = createdAt.gt as Date;
        const candidates = builtVersions.filter((b) => b.versionId === versionId && b.createdAt > gt);
        if (candidates.length === 0) return null;
        candidates.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        return candidates[0];
      }),
    },
    // comps
    releaseComponent: {
      findMany: jest.fn(async () => components),
    },
    componentVersion: {
      findMany: jest.fn(async (args: any) => {
        if (args.where?.builtVersionId) {
          const id = args.where.builtVersionId;
          return componentVersions.filter((cv) => cv.builtVersionId === id);
        }
        return componentVersions;
      }),
      create: jest.fn(async (args: any) => {
        const row: CV = {
          id: `cv-${++cvAuto}`,
          releaseComponentId: args.data.releaseComponent.connect.id,
          builtVersionId: args.data.builtVersion.connect.id,
          name: args.data.name,
          increment: args.data.increment,
          tokenValues: args.data.tokenValues,
        };
        componentVersions.push(row);
        return row;
      }),
      update: jest.fn(async (args: any) => {
        const idx = componentVersions.findIndex((cv) => cv.id === args.where.id);
        if (idx >= 0) {
          componentVersions[idx] = { ...componentVersions[idx], ...args.data };
          return componentVersions[idx];
        }
        throw new Error("not found");
      }),
      delete: jest.fn(async (args: any) => {
        const idx = componentVersions.findIndex((cv) => cv.id === args.where.id);
        if (idx >= 0) {
          const [removed] = componentVersions.splice(idx, 1);
          return removed;
        }
        throw new Error("not found");
      }),
    },
    builtVersionTransition: {
      findFirst: jest.fn(async () => ({ toStatus: "in_deployment" })),
    },
  };

  return { db, ids: { REL_ID, BUILT_X, BUILT_Y }, componentVersions } as const;
}

describe("SuccessorBuiltService.createSuccessorBuilt", () => {
  const comps = [
    { id: "A", namingPattern: "{release_version}-{built_version}-{increment}" },
    { id: "B", namingPattern: "{release_version}-{built_version}-{increment}" },
    { id: "C", namingPattern: "{release_version}-{built_version}-{increment}" },
  ];

  test("selecting all keeps rows on current and seeds successor", async () => {
    const { db, ids, componentVersions } = setupMockDb({ components: comps, currentBuiltName: "version 1.0", successorBuiltName: "version 1.1" });
    const svc = new SuccessorBuiltService(db as any);
    await svc.createSuccessorBuilt(ids.BUILT_X as any, comps.map((c) => c.id), "user-1" as any);
    const onX = componentVersions.filter((cv) => cv.builtVersionId === ids.BUILT_X);
    const onY = componentVersions.filter((cv) => cv.builtVersionId === ids.BUILT_Y);
    expect(onX.map((r) => r.releaseComponentId).sort()).toEqual(["A", "B", "C"]);
    expect(onY.map((r) => r.releaseComponentId).sort()).toEqual(["A", "B", "C"]);
  });

  test("unselected move to successor; selected remain and seed successor", async () => {
    const { db, ids, componentVersions } = setupMockDb({ components: comps, currentBuiltName: "version 1.0", successorBuiltName: "version 1.1" });
    const svc = new SuccessorBuiltService(db as any);
    await svc.createSuccessorBuilt(ids.BUILT_X as any, ["A", "C"], "user-1" as any);
    const onX = componentVersions.filter((cv) => cv.builtVersionId === ids.BUILT_X);
    const onY = componentVersions.filter((cv) => cv.builtVersionId === ids.BUILT_Y);
    // current (closed): only A and C
    expect(onX.map((r) => r.releaseComponentId).sort()).toEqual(["A", "C"]);
    // successor: moved B and seeded A,C
    expect(onY.map((r) => r.releaseComponentId).sort()).toEqual(["A", "B", "C"]);
  });

  test("validation: at least one component must be selected", async () => {
    const { db, ids } = setupMockDb({ components: comps, currentBuiltName: "version 1.0", successorBuiltName: "version 1.1" });
    const svc = new SuccessorBuiltService(db as any);
    await expect(svc.createSuccessorBuilt(ids.BUILT_X as any, [], "user-1" as any)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

