import { BuiltVersionStatusService } from "~/server/services/built-version-status.service";
import { BuiltVersionService } from "~/server/services/built-version.service";
import { ReleaseVersionService } from "~/server/services/release-version.service";

const COMPONENT_A_ID = "018f1a50-0000-7000-8000-00000000000a";
const COMPONENT_B_ID = "018f1a50-0000-7000-8000-00000000000b";
const REL_MAIN_ID = "018f1a50-0000-7000-8000-00000000000c";
const REL_SECONDARY_ID = "018f1a50-0000-7000-8000-00000000000d";
const BUILT_VERSION_LIST_ID = "018f1a50-0000-7000-8000-00000000000e";
const ACTIVE_BUILT_ID = "018f1a50-0000-7000-8000-00000000000f";
const NEWER_BUILT_ID = "018f1a50-0000-7000-8000-000000000010";
const COMPONENT_VERSION_ID = "018f1a50-0000-7000-9000-0000000000c1";
const USER_1_ID = "018f1a50-0000-7000-9000-0000000001a1";
const USER_2_ID = "018f1a50-0000-7000-9000-0000000001a2";
const TRANSITION_ID = "018f1a50-0000-7000-9000-0000000002b1";

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
        const all = [
          {
            id: COMPONENT_A_ID,
            namingPattern: "{release_version}-{built_version}-{increment}",
            releaseScope: "global",
          },
          {
            id: COMPONENT_B_ID,
            namingPattern: "{release_version}-{built_version}-{increment}",
            releaseScope: "version_bound",
          },
        ];
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

describe("ReleaseVersion and BuiltVersion behavior", () => {
  describe("ReleaseVersionService.create()", () => {
    test("creating a release creates an initial builtVersion named *.0 and seeds all components", async () => {
      const { db, calls } = makeMockDb();
      // Mock Release name when looked up by BuiltVersionService
      db.releaseVersion.findUniqueOrThrow = jest.fn(async () => ({
        id: REL_MAIN_ID,
        name: "version 100",
      }));

      const svc = new ReleaseVersionService(db);
      await svc.create(USER_1_ID, "version 100");

      // builtVersion created alongside
      expect(db.builtVersion.create).toHaveBeenCalled();
      const builtCalls = calls["builtVersion.create"] ?? [];
      const builtArgs = builtCalls[0] as any;
      expect(builtArgs).toBeDefined();
      expect(builtArgs?.data?.name).toBe("version 100.0"); // ends with .0

      // component versions created for each release component (2 total)
      expect(db.componentVersion.upsert).toHaveBeenCalledTimes(2);
      const seededComponentIds = new Set(
        (db.componentVersion.upsert as jest.Mock).mock.calls.map(
          ([args]: any[]) =>
            args.create.releaseComponent.connect.id as typeof COMPONENT_A_ID,
        ),
      );
      expect(seededComponentIds).toEqual(
        new Set([COMPONENT_A_ID, COMPONENT_B_ID]),
      );
      (db.componentVersion.upsert as jest.Mock).mock.calls.forEach(
        ([args]: any[]) => {
          expect(args.create.increment).toBe(0);
          expect(args.where).toMatchObject({
            builtVersionId_releaseComponentId: {
              builtVersionId: expect.any(String),
              releaseComponentId: expect.any(String),
            },
          });
        },
      );
    });
    test("creating a release requests naming data for all components", async () => {
      const { db } = makeMockDb();
      db.releaseComponent.findMany = jest.fn(async (args: any) => {
        expect(args).toMatchObject({
          select: {
            id: true,
            namingPattern: true,
          },
        });
        return [
          {
            id: COMPONENT_A_ID,
            namingPattern: "{release_version}-{built_version}-{increment}",
            releaseScope: "global",
          },
          {
            id: COMPONENT_B_ID,
            namingPattern: "{release_version}-{built_version}-{increment}",
            releaseScope: "version_bound",
          },
        ];
      });
      db.releaseVersion.findUniqueOrThrow = jest.fn(async () => ({
        id: REL_MAIN_ID,
        name: "version 101",
      }));

      const svc = new ReleaseVersionService(db);
      await svc.create(USER_1_ID, "version 101");

      expect(db.componentVersion.upsert).toHaveBeenCalledTimes(2);
      const componentIds = (db.componentVersion.upsert as jest.Mock).mock.calls
        .map(([args]: any[]) => args.create.releaseComponent.connect.id)
        .sort();
      expect(componentIds).toEqual([COMPONENT_A_ID, COMPONENT_B_ID].sort());
    });
    test("creating a builtVersion creates component versions for each release component", async () => {
      const { db } = makeMockDb();
      const REL2 = REL_SECONDARY_ID;
      db.releaseVersion.findUniqueOrThrow = jest.fn(async () => ({
        id: REL2,
        name: "version 200",
      }));
      const bsvc = new BuiltVersionService(db);
      await bsvc.create(USER_1_ID, REL2 as any, "version 200.0");
      // Only global component triggers creation
      expect(db.componentVersion.create).toHaveBeenCalledTimes(1);
    });
  });
  describe("ReleaseVersionService.list()", () => {
    test("list returns bare DTOs when no relations are requested", async () => {
      const { db } = makeMockDb();
      const createdAt = new Date("2024-01-01T12:00:00Z");
      db.releaseVersion.count = jest.fn(async () => 1);
      db.releaseVersion.findMany = jest.fn(async () => [
        { id: REL_MAIN_ID, name: "Release 100", createdAt },
      ]);

      const svc = new ReleaseVersionService(db);
      const page = await svc.list({
        page: 1,
        pageSize: 10,
        sortBy: "createdAt",
      });

      expect(page.data).toHaveLength(1);
      expect(page.data[0]).toEqual({
        id: REL_MAIN_ID,
        name: "Release 100",
        createdAt: createdAt.toISOString(),
      });
      const args = db.releaseVersion.findMany.mock.calls[0]?.[0] ?? {};
      expect(args.include).toBeUndefined();
    });
    test("list merges requested relations, including nested built data", async () => {
      const { db } = makeMockDb();
      const releaseCreatedAt = new Date("2024-02-01T09:00:00Z");
      const builtCreatedAt = new Date("2024-02-02T10:00:00Z");
      db.releaseVersion.count = jest.fn(async () => 1);
      db.releaseVersion.findMany = jest.fn(async () => [
        {
          id: REL_MAIN_ID,
          name: "Release 200",
          createdAt: releaseCreatedAt,
          createdBy: {
            id: USER_1_ID,
            name: "Test User",
            email: "user@example.com",
          },
          builtVersions: [
            {
              id: BUILT_VERSION_LIST_ID,
              name: "Release 200.0",
              versionId: REL_MAIN_ID,
              createdAt: builtCreatedAt,
              componentVersions: [
                {
                  id: COMPONENT_VERSION_ID,
                  releaseComponentId: COMPONENT_A_ID,
                  builtVersionId: BUILT_VERSION_LIST_ID,
                  name: "component-a",
                  increment: 0,
                  createdAt: builtCreatedAt,
                },
              ],
              BuiltVersionTransition: [
                {
                  id: TRANSITION_ID,
                  builtVersionId: BUILT_VERSION_LIST_ID,
                  fromStatus: "in_development",
                  toStatus: "in_deployment",
                  action: "start_deployment",
                  createdAt: builtCreatedAt,
                  createdById: USER_2_ID,
                },
              ],
            },
          ],
        },
      ]);

      const svc = new ReleaseVersionService(db);
      const page = await svc.list(
        { page: 1, pageSize: 5, sortBy: "-createdAt" },
        {
          relations: [
            "creater",
            "builtVersions",
            "builtVersions.deployedComponents",
            "builtVersions.transitions",
          ],
        },
      );

      const [item] = page.data;
      expect(item?.creater).toEqual({
        id: USER_1_ID,
        name: "Test User",
        email: "user@example.com",
      });
      expect(item?.builtVersions).toEqual([
        {
          id: BUILT_VERSION_LIST_ID,
          name: "Release 200.0",
          versionId: REL_MAIN_ID,
          createdAt: builtCreatedAt.toISOString(),
          deployedComponents: [
            {
              id: COMPONENT_VERSION_ID,
              releaseComponentId: COMPONENT_A_ID,
              builtVersionId: BUILT_VERSION_LIST_ID,
              name: "component-a",
              increment: 0,
              createdAt: builtCreatedAt.toISOString(),
            },
          ],
          transitions: [
            {
              id: TRANSITION_ID,
              builtVersionId: BUILT_VERSION_LIST_ID,
              fromStatus: "in_development",
              toStatus: "in_deployment",
              action: "start_deployment",
              createdAt: builtCreatedAt.toISOString(),
              createdById: USER_2_ID,
            },
          ],
        },
      ]);
      const findManyCalls = (db.releaseVersion.findMany as jest.Mock).mock
        .calls as Array<[Record<string, unknown>]>;
      const args = findManyCalls[0]?.[0] ?? {};
      const include = (
        args as {
          include?: {
            createdBy?: { select?: Record<string, boolean> };
            builtVersions?: { select?: Record<string, unknown> };
          };
        }
      ).include;
      expect(include?.createdBy?.select).toEqual({
        id: true,
        name: true,
        email: true,
      });
      expect(include?.builtVersions?.select?.componentVersions).toBeDefined();
      expect(
        include?.builtVersions?.select?.BuiltVersionTransition,
      ).toBeDefined();
    });
  });
  describe("ReleaseVersionService.getById()", () => {
    test("getById returns relations only when requested", async () => {
      const { db } = makeMockDb();
      const createdAt = new Date("2024-03-01T11:00:00Z");
      const builtCreatedAt = new Date("2024-03-02T12:00:00Z");
      db.releaseVersion.findUnique = jest.fn(async () => ({
        id: REL_MAIN_ID,
        name: "Release 300",
        createdAt,
        createdBy: {
          id: USER_1_ID,
          name: "Release Owner",
          email: null,
        },
        builtVersions: [
          {
            id: BUILT_VERSION_LIST_ID,
            name: "Release 300.0",
            versionId: REL_MAIN_ID,
            createdAt: builtCreatedAt,
            componentVersions: [],
            BuiltVersionTransition: [],
          },
        ],
      }));

      const svc = new ReleaseVersionService(db);
      const base = await svc.getById(REL_MAIN_ID, { relations: [] });
      expect(base).toEqual({
        id: REL_MAIN_ID,
        name: "Release 300",
        createdAt: createdAt.toISOString(),
      });

      const enriched = await svc.getById(REL_MAIN_ID, {
        relations: [
          "creater",
          "builtVersions",
          "builtVersions.deployedComponents",
          "builtVersions.transitions",
        ],
      });
      expect(enriched.creater).toEqual({
        id: USER_1_ID,
        name: "Release Owner",
        email: null,
      });
      expect(enriched.builtVersions).toEqual([
        {
          id: BUILT_VERSION_LIST_ID,
          name: "Release 300.0",
          versionId: REL_MAIN_ID,
          createdAt: builtCreatedAt.toISOString(),
          deployedComponents: [],
          transitions: [],
        },
      ]);
      const findUniqueCalls = (db.releaseVersion.findUnique as jest.Mock).mock
        .calls as Array<[Record<string, unknown>]>;
      const args = findUniqueCalls.at(-1)?.[0] ?? {};
      const include = (
        args as {
          include?: { builtVersions?: { orderBy?: Record<string, unknown> } };
        }
      ).include;
      expect(include?.builtVersions?.orderBy).toEqual({ createdAt: "desc" });
    });
  });
  describe("TODO: Transition Service Tests", () => {
    // TODO: Move to separate service and test
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
    //TODO: Move to dedicated service
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

  describe("TODO: Move to BuiltVersionService Tests", () => {
    //TODO: move to BuiltVersionService Test Suite
    test("listByRelease maps rows to DTOs", async () => {
      const { db } = makeMockDb();
      const versionId = "00000000-0000-7000-8000-000000000024";
      const createdAt = new Date("2024-02-01T00:00:00Z");
      db.builtVersion.findMany = jest.fn(async () => [
        { id: BUILT_VERSION_LIST_ID, name: "v100.1", versionId, createdAt },
      ]);

      const svc = new BuiltVersionService(db);
      const rows = await svc.listByRelease(versionId as any);

      expect(db.builtVersion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { versionId } }),
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        id: BUILT_VERSION_LIST_ID,
        name: "v100.1",
        versionId,
      });
      expect(rows[0]?.createdAt).toBe(createdAt.toISOString());
    });
    //TODO: move to BuiltVersionService Test Suite
    test("default selection returns components from latest active built", async () => {
      const { db } = makeMockDb();
      const builtVersionId = "66666666-6666-6666-6666-666666666666";
      const versionId = "77777777-7777-7777-7777-777777777777";
      const activeBuiltId = ACTIVE_BUILT_ID;

      db.builtVersion.findUniqueOrThrow = jest.fn(async () => ({
        id: builtVersionId,
        versionId,
      }));
      db.builtVersion.findMany = jest.fn(async () => [
        { id: activeBuiltId },
        { id: builtVersionId },
      ]);
      db.builtVersionTransition.findMany = jest.fn(async () => [
        {
          builtVersionId: activeBuiltId,
          toStatus: "active",
          createdAt: new Date(),
        },
        { builtVersionId, toStatus: "in_development", createdAt: new Date() },
      ]);
      db.releaseComponent.findMany = jest.fn(async (args: any) => {
        expect(args).toMatchObject({
          where: { releaseScope: "global" },
          select: { id: true },
        });
        return [{ id: COMPONENT_A_ID }];
      });
      db.componentVersion.findMany = jest.fn(async () => [
        { releaseComponentId: COMPONENT_B_ID },
      ]);

      const svc = new BuiltVersionService(db);
      const res = await svc.getDefaultSelection(builtVersionId as any);

      expect(new Set(res.selectedReleaseComponentIds)).toEqual(
        new Set([COMPONENT_A_ID, COMPONENT_B_ID]),
      );
      expect(db.componentVersion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { builtVersionId: activeBuiltId } }),
      );
    });
    //TODO: move to BuiltVersionService Test Suite
    test("default selection falls back to global components when none active", async () => {
      const { db } = makeMockDb();
      const builtVersionId = "88888888-8888-8888-8888-888888888888";
      const versionId = "99999999-9999-9999-9999-999999999999";

      db.builtVersion.findUniqueOrThrow = jest.fn(async () => ({
        id: builtVersionId,
        versionId,
      }));
      db.builtVersion.findMany = jest.fn(async () => [{ id: builtVersionId }]);
      db.builtVersionTransition.findMany = jest.fn(async () => []);
      db.releaseComponent.findMany = jest.fn(async (args: any) => {
        expect(args).toMatchObject({
          where: { releaseScope: "global" },
          select: { id: true },
        });
        return [{ id: COMPONENT_A_ID }];
      });

      const svc = new BuiltVersionService(db);
      const res = await svc.getDefaultSelection(builtVersionId as any);

      expect(res.selectedReleaseComponentIds).toEqual([COMPONENT_A_ID]);
      expect(db.releaseComponent.findMany).toHaveBeenCalled();
    });
  });
});
