import { releaseComponentFixtureList } from "../fixtures/release-components";
import { releaseVersionFixtures } from "../fixtures/release-versions";
import { userFixtures } from "../fixtures/users";
import { PatchStatusService } from "~/server/services/patch-status.service";

const REL_MAIN_ID = releaseVersionFixtures.version177.id;
const PATCH_LIST_ID = "018f1a50-0000-7000-8000-00000000000e";
const ACTIVE_PATCH_ID = "018f1a50-0000-7000-8000-00000000000f";
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
    $transaction: async (fn: (tx: any) => Promise<any>) => {
      return await fn(db);
    },
    // ReleaseVersion
    releaseVersion: {
      create: jest.fn(async (args: any) => {
        record("releaseVersion.create", args);
        return { id: REL_ID, name: args.data.name, createdAt: new Date() };
      }),
      update: jest.fn(async (args: any) => {
        record("releaseVersion.update", args);
        return {
          id: args.where.id,
          lastUsedIncrement: args.data.lastUsedIncrement,
        };
      }),
      findUnique: jest.fn(async (args: any = {}) => ({
        id: args?.where?.id ?? REL_ID,
        name: "version 100.0",
        versionId: REL_ID,
        createdAt: new Date(),
        lastUsedIncrement: 0,
      })),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    // Patch
    patch: {
      create: jest.fn(async (args: any) => {
        record("patch.create", args);
        const id = makeUuid(++patchAutoInc);
        const versionId = args.data.version?.connect?.id ?? REL_ID;
        return { id, name: args.data.name, versionId, createdAt: new Date() };
      }),
      update: jest.fn(async (args: any) => {
        record("patch.update", args);
        return { id: args.where.id, ...args.data };
      }),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(async (args: any) => ({
        id: args.where.id,
        name: "version 100.0",
        versionId: REL_ID,
        createdAt: new Date(),
      })),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    // ReleaseComponent
    releaseComponent: {
      findMany: jest.fn(async (args: any = {}) => {
        record("releaseComponent.findMany", {});
        const all = releaseComponentFixtureList.map((fixture) => ({
          id: fixture.id,
          namingPattern: fixture.namingPattern,
          releaseScope:
            fixture.releaseScope === "version-bound"
              ? "version_bound"
              : "global",
        }));
        if (args?.where?.releaseScope === "global") {
          return all.filter((entry) => entry.releaseScope === "global");
        }
        return all;
      }),
    },
    // ComponentVersion
    componentVersion: {
      create: jest.fn(async (args: any) => {
        record("componentVersion.create", args);
        const id = makeUuid(
          2000 + (calls["componentVersion.create"]?.length ?? 0),
        );
        return { id, name: args.data.name, increment: args.data.increment };
      }),
      upsert: jest.fn(async (args: any) => {
        record("componentVersion.upsert", args);
        const id = makeUuid(
          3000 + (calls["componentVersion.upsert"]?.length ?? 0),
        );
        return {
          id,
          name: args.create.name,
          increment: args.create.increment,
        };
      }),
      findFirst: jest.fn(async () => null),
      findMany: jest.fn(),
    },
    // Transition history
    patchTransition: {
      findFirst: jest.fn(async () => ({ toStatus: "in_development" })),
      create: jest.fn(async (args: any) => ({ id: "t1", ...args.data })),
      findMany: jest.fn(),
    },
    // Users not needed beyond connect
  };

  return { db, calls } as const;
}

describe("PatchStatusService", () => {
  describe("transition()", () => {
    test("transition to in_deployment creates a successor with higher increment", async () => {
      const { db, calls } = makeMockDb();
      const createdAt = new Date("2024-01-01T00:00:00Z");
      db.patch.findUnique = jest.fn(async () => ({
        id: PATCH_LIST_ID,
        name: "version 300.0",
        versionId: REL_MAIN_ID,
        createdAt,
      }));
      db.releaseVersion.findUnique = jest.fn(async () => ({
        id: REL_MAIN_ID,
        name: "version 300",
        lastUsedIncrement: 0,
      }));
      db.patch.findFirst = jest.fn(async () => null); // no newer exists

      const ssvc = new PatchStatusService(db);
      const res = await ssvc.transition(
        PATCH_LIST_ID as any,
        "startDeployment",
        USER_1_ID,
      );
      expect(res.status).toBe("in_deployment");
      expect(res.patch).toMatchObject({
        id: PATCH_LIST_ID,
        name: "version 300.0",
        versionId: REL_MAIN_ID,
        createdAt,
      });

      // Successor created with next increment (1)
      const successorCalls = calls["patch.create"] ?? [];
      const succ = successorCalls[0] as any;
      expect(succ).toBeDefined();
      expect(succ?.data?.name).toBe("version 300.1");
    });

    test("no successor is created if a newer patch already exists", async () => {
      const { db } = makeMockDb();
      const createdAt = new Date("2024-01-01T00:00:00Z");
      db.patch.findUnique = jest.fn(async () => ({
        id: ACTIVE_PATCH_ID,
        name: "version 400.0",
        versionId: REL_MAIN_ID,
        createdAt,
      }));
      db.releaseVersion.findUnique = jest.fn(async () => ({
        id: REL_MAIN_ID,
        name: "version 400",
        lastUsedIncrement: 1,
      }));
      // Simulate a newer build existing
      db.patch.findFirst = jest.fn(async () => ({ id: NEWER_PATCH_ID }));

      const ssvc = new PatchStatusService(db);
      await ssvc.transition(
        ACTIVE_PATCH_ID as any,
        "startDeployment",
        USER_1_ID,
      );
      // ensure patch.create was NOT called
      expect(db.patch.create).not.toHaveBeenCalled();
      // ensure no component versions were created either
      expect(db.componentVersion.create).not.toHaveBeenCalled();
    });
  });
});
