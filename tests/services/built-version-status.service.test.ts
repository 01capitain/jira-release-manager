import { releaseComponentFixtureList } from "../fixtures/release-components";
import { releaseVersionFixtures } from "../fixtures/release-versions";
import { userFixtures } from "../fixtures/users";
import { BuiltVersionStatusService } from "~/server/services/built-version-status.service";

const REL_MAIN_ID = releaseVersionFixtures.version177.id;
const BUILT_VERSION_LIST_ID = "018f1a50-0000-7000-8000-00000000000e";
const ACTIVE_BUILT_ID = "018f1a50-0000-7000-8000-00000000000f";
const NEWER_BUILT_ID = "018f1a50-0000-7000-8000-000000000010";
const USER_1_ID = userFixtures.adamScott.id;

// Minimal Prisma-like client mock with only fields used in tests
function makeMockDb() {
  const calls: Record<string, unknown[]> = {};
  const record = (key: string, payload: unknown) => {
    calls[key] = calls[key] ?? [];
    calls[key].push(payload);
  };

  const REL_ID = REL_MAIN_ID;
  let builtAutoInc = 0;
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
    // BuiltVersion
    builtVersion: {
      create: jest.fn(async (args: any) => {
        record("builtVersion.create", args);
        const id = makeUuid(++builtAutoInc);
        const versionId = args.data.version?.connect?.id ?? REL_ID;
        return { id, name: args.data.name, versionId, createdAt: new Date() };
      }),
      update: jest.fn(async (args: any) => {
        record("builtVersion.update", args);
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
    builtVersionTransition: {
      findFirst: jest.fn(async () => ({ toStatus: "in_development" })),
      create: jest.fn(async (args: any) => ({ id: "t1", ...args.data })),
      findMany: jest.fn(),
    },
    // Users not needed beyond connect
  };

  return { db, calls } as const;
}

describe("BuiltVersionStatusService", () => {
  describe("transition()", () => {
    test("transition to in_deployment creates a successor with higher increment", async () => {
      const { db, calls } = makeMockDb();
      const createdAt = new Date("2024-01-01T00:00:00Z");
      db.builtVersion.findUnique = jest.fn(async () => ({
        id: BUILT_VERSION_LIST_ID,
        name: "version 300.0",
        versionId: REL_MAIN_ID,
        createdAt,
      }));
      db.releaseVersion.findUnique = jest.fn(async () => ({
        id: REL_MAIN_ID,
        name: "version 300",
        lastUsedIncrement: 0,
      }));
      db.builtVersion.findFirst = jest.fn(async () => null); // no newer exists

      const ssvc = new BuiltVersionStatusService(db);
      const res = await ssvc.transition(
        BUILT_VERSION_LIST_ID as any,
        "startDeployment",
        USER_1_ID,
      );
      expect(res.status).toBe("in_deployment");
      expect(res.builtVersion).toMatchObject({
        id: BUILT_VERSION_LIST_ID,
        name: "version 300.0",
        versionId: REL_MAIN_ID,
        createdAt,
      });

      // Successor created with next increment (1)
      const successorCalls = calls["builtVersion.create"] ?? [];
      const succ = successorCalls[0] as any;
      expect(succ).toBeDefined();
      expect(succ?.data?.name).toBe("version 300.1");
    });

    test("no successor is created if a newer built already exists", async () => {
      const { db } = makeMockDb();
      const createdAt = new Date("2024-01-01T00:00:00Z");
      db.builtVersion.findUnique = jest.fn(async () => ({
        id: ACTIVE_BUILT_ID,
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
      db.builtVersion.findFirst = jest.fn(async () => ({ id: NEWER_BUILT_ID }));

      const ssvc = new BuiltVersionStatusService(db);
      await ssvc.transition(
        ACTIVE_BUILT_ID as any,
        "startDeployment",
        USER_1_ID,
      );
      // ensure builtVersion.create was NOT called
      expect(db.builtVersion.create).not.toHaveBeenCalled();
      // ensure no component versions were created either
      expect(db.componentVersion.create).not.toHaveBeenCalled();
    });
  });
});
