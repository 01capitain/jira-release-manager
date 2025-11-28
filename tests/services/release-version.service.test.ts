import {
  releaseComponentFixtures,
  releaseComponentFixtureList,
} from "../fixtures/release-components";
import { releaseVersionFixtures } from "../fixtures/release-versions";
import { userFixtures } from "../fixtures/users";
import { PatchService } from "~/server/services/patch.service";
import { ReleaseVersionService } from "~/server/services/release-version.service";
import type { ActionLogger } from "~/server/services/action-history.service";
import {
  DEFAULT_RELEASE_TRACK,
  type ReleaseTrack,
} from "~/shared/types/release-track";

const COMPONENT_A_ID = releaseComponentFixtures.iosApp.id;
const COMPONENT_B_ID = releaseComponentFixtures.phpBackend.id;
const REL_MAIN_ID = releaseVersionFixtures.version177.id;
const REL_SECONDARY_ID = releaseVersionFixtures.version26_1.id;
const PATCH_LIST_ID = "018f1a50-0000-7000-8000-00000000000e";
const ACTIVE_PATCH_ID = "018f1a50-0000-7000-8000-00000000000f";
const COMPONENT_VERSION_ID = "018f1a50-0000-7000-9000-0000000000c1";
const USER_1_ID = userFixtures.adamScott.id;
const USER_2_ID = userFixtures.melanieMayer.id;
const TRANSITION_ID = "018f1a50-0000-7000-9000-0000000002b1";

// Minimal Prisma-like client mock with only fields used in tests
function makeMockDb(initialTrack: ReleaseTrack = DEFAULT_RELEASE_TRACK) {
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

  let currentTrack: ReleaseTrack = initialTrack;
  const releaseRows: Record<
    string,
    { id: string; name: string; releaseTrack: ReleaseTrack; createdAt: Date }
  > = {
    [REL_ID]: {
      id: REL_ID,
      name: "version 100.0",
      releaseTrack: currentTrack,
      createdAt: new Date(),
    },
    [REL_SECONDARY_ID]: {
      id: REL_SECONDARY_ID,
      name: "version 26.1",
      releaseTrack: initialTrack,
      createdAt: new Date(),
    },
  };

  const db: any = {
    $transaction: async (fn: (tx: any) => Promise<any>) => {
      return await fn(db);
    },
    // ReleaseVersion
    releaseVersion: {
      create: jest.fn(async (args: any) => {
        record("releaseVersion.create", args);
        currentTrack = DEFAULT_RELEASE_TRACK;
        releaseRows[REL_ID] = {
          id: REL_ID,
          name: args.data.name,
          releaseTrack: currentTrack,
          createdAt: new Date(),
        };
        return releaseRows[REL_ID];
      }),
      update: jest.fn(async (args: any) => {
        record("releaseVersion.update", args);
        const targetId = args.where.id ?? REL_ID;
        if (typeof args.data.releaseTrack === "string") {
          currentTrack = args.data.releaseTrack as ReleaseTrack;
          const entry =
            releaseRows[targetId] ??
            (() => {
              const fallback = {
                id: targetId,
                name: "version 100.0",
                releaseTrack: currentTrack,
                createdAt: new Date(),
              };
              releaseRows[targetId] = fallback;
              return fallback;
            })();
          releaseRows[targetId] = { ...entry, releaseTrack: currentTrack };
          return releaseRows[targetId];
        }
        return {
          id: targetId,
          lastUsedIncrement: args.data.lastUsedIncrement,
        };
      }),
      findUnique: jest.fn(async (args: any = {}) => {
        const entry = releaseRows[args?.where?.id ?? REL_ID];
        return entry
          ? { ...entry, versionId: REL_ID }
          : {
              id: REL_ID,
              name: "version 100.0",
              versionId: REL_ID,
              releaseTrack: currentTrack,
              createdAt: new Date(),
            };
      }),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(async (_args: any = {}) => {
        return Object.values(releaseRows);
      }),
      count: jest.fn(async () => Object.keys(releaseRows).length),
    },
    // Patch
    patch: {
      create: jest.fn(async (args: any) => {
        record("patch.create", args);
        const id = makeUuid(++patchAutoInc);
        const versionId = args.data.version?.connect?.id ?? REL_ID;
        return {
          id,
          name: args.data.name,
          versionId,
          currentStatus: "in_development",
          createdAt: new Date(),
        };
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
        currentStatus: "in_development",
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
          name: fixture.name,
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

describe("ReleaseVersion and Patch behavior", () => {
  describe("ReleaseVersionService.create()", () => {
    test("creating a release creates an initial patch named *.0 and seeds all components", async () => {
      const { db, calls } = makeMockDb();
      // Mock Release name when looked up by PatchService
      db.releaseVersion.findUniqueOrThrow = jest.fn(async () => ({
        id: REL_MAIN_ID,
        name: "version 100",
      }));

      const svc = new ReleaseVersionService(db);
      await svc.create(USER_1_ID, "version 100");

      // patch created alongside
      expect(db.patch.create).toHaveBeenCalled();
      const patchCalls = calls["patch.create"] ?? [];
      const patchArgs = patchCalls[0] as any;
      expect(patchArgs).toBeDefined();
      expect(patchArgs?.data?.name).toBe("version 100.0"); // ends with .0

      // component versions created for each release component
      expect(db.componentVersion.upsert).toHaveBeenCalledTimes(
        releaseComponentFixtureList.length,
      );
      const seededComponentIds = new Set(
        (db.componentVersion.upsert as jest.Mock).mock.calls.map(
          ([args]: any[]) =>
            args.create.releaseComponent.connect.id as typeof COMPONENT_A_ID,
        ),
      );
      expect(seededComponentIds).toEqual(
        new Set(releaseComponentFixtureList.map((fixture) => fixture.id)),
      );
      expect(seededComponentIds.has(releaseComponentFixtures.iosApp.id)).toBe(
        true,
      );
      expect(
        seededComponentIds.has(releaseComponentFixtures.phpBackend.id),
      ).toBe(true);
      (db.componentVersion.upsert as jest.Mock).mock.calls.forEach(
        ([args]: any[]) => {
          expect(args.create.increment).toBe(0);
          expect(args.where).toMatchObject({
            patchId_releaseComponentId: {
              patchId: expect.any(String),
              releaseComponentId: expect.any(String),
            },
          });
        },
      );
    });
    test("creating a release requests naming data for all components", async () => {
      const { db } = makeMockDb();
      const expectedComponents = [
        {
          id: COMPONENT_A_ID,
          name: "Component A",
          namingPattern: "{release_version}-{patch}-{increment}",
          releaseScope: "global",
        },
        {
          id: COMPONENT_B_ID,
          name: "Component B",
          namingPattern: "{release_version}-{patch}-{increment}",
          releaseScope: "version_bound",
        },
      ];
      db.releaseComponent.findMany = jest.fn(async (args: any) => {
        expect(args).toMatchObject({
          select: {
            id: true,
            name: true,
            namingPattern: true,
            releaseScope: true,
          },
        });
        return expectedComponents;
      });
      db.releaseVersion.findUniqueOrThrow = jest.fn(async () => ({
        id: REL_MAIN_ID,
        name: "version 101",
      }));

      const svc = new ReleaseVersionService(db);
      await svc.create(USER_1_ID, "version 101");

      expect(db.componentVersion.upsert).toHaveBeenCalledTimes(
        expectedComponents.length,
      );
      const componentIds = new Set(
        (db.componentVersion.upsert as jest.Mock).mock.calls.map(
          ([args]: any[]) => args.create.releaseComponent.connect.id,
        ),
      );
      expect(componentIds).toEqual(
        new Set(expectedComponents.map((component) => component.id)),
      );
    });
    test("creating a release delegates patch creation and emits action history subactions", async () => {
      const { db } = makeMockDb();
      const patchId = PATCH_LIST_ID;
      const patchService = {
        createInitialForRelease: jest.fn(async (_tx: any, params: any) => ({
          patch: {
            id: patchId,
            name: params.patchName,
            versionId: params.releaseId,
            createdAt: new Date(),
          },
          auditTrail: [
            {
              subactionType: "patch.autoCreate",
              message: `Patch ${params.patchName} created`,
              metadata: { id: patchId, versionId: params.releaseId },
            },
            {
              subactionType: "componentVersion.seed",
              message: `Seeded ${releaseComponentFixtures.iosApp.name} for ${params.patchName}`,
              metadata: {
                releaseComponentId: releaseComponentFixtures.iosApp.id,
                patchId: patchId,
              },
            },
            {
              subactionType: "componentVersion.seed",
              message: `Seeded ${releaseComponentFixtures.phpBackend.name} for ${params.patchName}`,
              metadata: {
                releaseComponentId: releaseComponentFixtures.phpBackend.id,
                patchId: patchId,
              },
            },
          ],
        })),
      };
      const loggerSubactionMock = jest.fn(async () => undefined);
      const logger: ActionLogger = {
        id: "action-1",
        subaction: loggerSubactionMock,
        complete: jest.fn(async () => undefined),
      };

      const svc = new ReleaseVersionService(
        db,
        patchService as unknown as PatchService,
      );
      await svc.create(USER_1_ID, "version 102", { logger });

      expect(patchService.createInitialForRelease).toHaveBeenCalledTimes(1);
      const releaseCallEntries = (
        loggerSubactionMock as jest.Mock
      ).mock.calls.map(([entry]: [any]) => entry);
      const releasePersist = releaseCallEntries.filter(
        (entry) => entry.subactionType === "releaseVersion.persist",
      );
      expect(releasePersist).toHaveLength(1);

      const patchSubactions = releaseCallEntries.filter(
        (entry) => entry.subactionType === "patch.autoCreate",
      );
      expect(patchSubactions).toHaveLength(1);

      const componentSubactions = releaseCallEntries.filter(
        (entry) => entry.subactionType === "componentVersion.seed",
      );
      expect(componentSubactions).toHaveLength(2);
      for (const entry of componentSubactions) {
        expect(entry.message).toMatch(/Seeded (iOS App|PHP Backend)/);
      }
    });
    test("creating a patch creates component versions for each release component", async () => {
      const { db } = makeMockDb();
      const REL2 = REL_SECONDARY_ID;
      db.releaseVersion.findUniqueOrThrow = jest.fn(async () => ({
        id: REL2,
        name: "version 200",
      }));
      const bsvc = new PatchService(db);
      await bsvc.create(USER_1_ID, REL2 as any, "version 200.0");
      // Only global components trigger creation
      const globalCount = releaseComponentFixtureList.filter(
        (fixture) => fixture.releaseScope === "global",
      ).length;
      expect(db.componentVersion.create).toHaveBeenCalledTimes(globalCount);
    });
  });
  describe("ReleaseVersionService.list()", () => {
    test("list returns bare DTOs when no relations are requested", async () => {
      const { db } = makeMockDb();
      const createdAt = new Date("2024-01-01T12:00:00Z");
      db.releaseVersion.count = jest.fn(async () => 1);
      db.releaseVersion.findMany = jest.fn(async () => [
        {
          id: REL_MAIN_ID,
          name: "Release 100",
          releaseTrack: DEFAULT_RELEASE_TRACK,
          createdAt,
        },
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
        releaseTrack: DEFAULT_RELEASE_TRACK,
        createdAt: createdAt.toISOString(),
      });
      const args = db.releaseVersion.findMany.mock.calls[0]?.[0] ?? {};
      expect(args.include).toBeUndefined();
    });
    test("list merges requested relations, including nested patch data", async () => {
      const { db } = makeMockDb();
      const releaseCreatedAt = new Date("2024-02-01T09:00:00Z");
      const patchCreatedAt = new Date("2024-02-02T10:00:00Z");
      db.releaseVersion.count = jest.fn(async () => 1);
      db.releaseVersion.findMany = jest.fn(async () => [
        {
          id: REL_MAIN_ID,
          name: "Release 200",
          releaseTrack: "Beta",
          createdAt: releaseCreatedAt,
          createdBy: {
            id: USER_1_ID,
            name: "Test User",
            email: "user@example.com",
          },
          patches: [
            {
              id: PATCH_LIST_ID,
              name: "Release 200.0",
              versionId: REL_MAIN_ID,
              createdAt: patchCreatedAt,
              currentStatus: "in_development",
              componentVersions: [
                {
                  id: COMPONENT_VERSION_ID,
                  releaseComponentId: COMPONENT_A_ID,
                  patchId: PATCH_LIST_ID,
                  name: "component-a",
                  increment: 0,
                  createdAt: patchCreatedAt,
                },
              ],
              PatchTransition: [
                {
                  id: TRANSITION_ID,
                  patchId: PATCH_LIST_ID,
                  fromStatus: "in_development",
                  toStatus: "in_deployment",
                  action: "start_deployment",
                  createdAt: patchCreatedAt,
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
            "patches",
            "patches.deployedComponents",
            "patches.transitions",
          ],
        },
      );

      const [item] = page.data;
      expect(item?.releaseTrack).toBe("Beta");
      expect(item?.creater).toEqual({
        id: USER_1_ID,
        name: "Test User",
        email: "user@example.com",
      });
      expect(item?.patches).toEqual([
        {
          id: PATCH_LIST_ID,
          name: "Release 200.0",
          versionId: REL_MAIN_ID,
          createdAt: patchCreatedAt.toISOString(),
          currentStatus: "in_development",
          deployedComponents: [
            {
              id: COMPONENT_VERSION_ID,
              releaseComponentId: COMPONENT_A_ID,
              patchId: PATCH_LIST_ID,
              name: "component-a",
              increment: 0,
              createdAt: patchCreatedAt.toISOString(),
            },
          ],
          transitions: [
            {
              id: TRANSITION_ID,
              patchId: PATCH_LIST_ID,
              fromStatus: "in_development",
              toStatus: "in_deployment",
              action: "startDeployment",
              createdAt: patchCreatedAt.toISOString(),
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
            patches?: { select?: Record<string, unknown> };
          };
        }
      ).include;
      expect(include?.createdBy?.select).toEqual({
        id: true,
        name: true,
        email: true,
      });
      expect(include?.patches?.select?.componentVersions).toBeDefined();
      expect(include?.patches?.select?.PatchTransition).toBeDefined();
    });
  });
  describe("ReleaseVersionService.getById()", () => {
    test("getById returns relations only when requested", async () => {
      const { db } = makeMockDb();
      const createdAt = new Date("2024-03-01T11:00:00Z");
      const patchCreatedAt = new Date("2024-03-02T12:00:00Z");
      db.releaseVersion.findUnique = jest.fn(async () => ({
        id: REL_MAIN_ID,
        name: "Release 300",
        releaseTrack: "Rollout",
        createdAt,
        createdBy: {
          id: USER_1_ID,
          name: "Release Owner",
          email: null,
        },
        patches: [
          {
            id: PATCH_LIST_ID,
            name: "Release 300.0",
            versionId: REL_MAIN_ID,
            createdAt: patchCreatedAt,
            currentStatus: "in_development",
            componentVersions: [],
            PatchTransition: [],
          },
        ],
      }));

      const svc = new ReleaseVersionService(db);
      const base = await svc.getById(REL_MAIN_ID, { relations: [] });
      expect(base).toEqual({
        id: REL_MAIN_ID,
        name: "Release 300",
        releaseTrack: "Rollout",
        createdAt: createdAt.toISOString(),
      });

      const enriched = await svc.getById(REL_MAIN_ID, {
        relations: [
          "creater",
          "patches",
          "patches.deployedComponents",
          "patches.transitions",
        ],
      });
      expect(enriched.creater).toEqual({
        id: USER_1_ID,
        name: "Release Owner",
        email: null,
      });
      expect(enriched.patches).toEqual([
        {
          id: PATCH_LIST_ID,
          name: "Release 300.0",
          versionId: REL_MAIN_ID,
          createdAt: patchCreatedAt.toISOString(),
          currentStatus: "in_development",
          deployedComponents: [],
          transitions: [],
        },
      ]);
      const findUniqueCalls = (db.releaseVersion.findUnique as jest.Mock).mock
        .calls as Array<[Record<string, unknown>]>;
      const args = findUniqueCalls.at(-1)?.[0] ?? {};
      const include = (
        args as {
          include?: { patches?: { orderBy?: Record<string, unknown> } };
        }
      ).include;
      expect(include?.patches?.orderBy).toEqual({ createdAt: "desc" });
    });
  });
  describe("TODO: Move to PatchService Tests", () => {
    test("createInitialForRelease seeds all release components with increment 0", async () => {
      const { db } = makeMockDb();
      const svc = new PatchService(db);
      const releaseName = "version 300";
      const patchName = `${releaseName}.0`;

      const result = await svc.createInitialForRelease(db, {
        userId: USER_1_ID,
        releaseId: REL_MAIN_ID,
        releaseName,
        patchName,
      });

      expect(db.releaseVersion.findUniqueOrThrow).not.toHaveBeenCalled();
      expect(db.patch.create).toHaveBeenCalledTimes(1);
      expect(db.componentVersion.upsert).toHaveBeenCalledTimes(
        releaseComponentFixtureList.length,
      );
      for (const [args] of (db.componentVersion.upsert as jest.Mock).mock
        .calls) {
        expect(args.create.increment).toBe(0);
      }
      const seedSubactions = result.auditTrail.filter(
        (entry) => entry.subactionType === "componentVersion.seed",
      );
      expect(seedSubactions).toHaveLength(releaseComponentFixtureList.length);
      expect(seedSubactions.map((entry) => entry.message)).toEqual(
        expect.arrayContaining([
          expect.stringContaining(releaseComponentFixtures.iosApp.name),
          expect.stringContaining(releaseComponentFixtures.phpBackend.name),
        ]),
      );
    });
    //TODO: move to PatchService Test Suite
    test("listByRelease maps rows to DTOs", async () => {
      const { db } = makeMockDb();
      const versionId = "00000000-0000-7000-8000-000000000024";
      const createdAt = new Date("2024-02-01T00:00:00Z");
      db.patch.findMany = jest.fn(async () => [
        {
          id: PATCH_LIST_ID,
          name: "v100.1",
          versionId,
          currentStatus: "in_development",
          createdAt,
        },
      ]);

      const svc = new PatchService(db);
      const rows = await svc.listByRelease(versionId as any);

      expect(db.patch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { versionId } }),
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        id: PATCH_LIST_ID,
        name: "v100.1",
        versionId,
      });
      expect(rows[0]?.createdAt).toBe(createdAt.toISOString());
      expect(rows[0]?.currentStatus).toBe("in_development");
    });
    //TODO: move to PatchService Test Suite
    test("default selection returns components from latest active patch", async () => {
      const { db } = makeMockDb();
      const patchId = "66666666-6666-6666-6666-666666666666";
      const versionId = "77777777-7777-7777-7777-777777777777";
      const activePatchId = ACTIVE_PATCH_ID;

      db.patch.findUniqueOrThrow = jest.fn(async () => ({
        id: patchId,
        versionId,
      }));
      db.patch.findMany = jest.fn(async () => [
        { id: activePatchId, currentStatus: "active" },
        { id: patchId, currentStatus: "in_development" },
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

      const svc = new PatchService(db);
      const res = await svc.getDefaultSelection(patchId as any);

      expect(new Set(res.selectedReleaseComponentIds)).toEqual(
        new Set([COMPONENT_A_ID, COMPONENT_B_ID]),
      );
      expect(db.componentVersion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { patchId: activePatchId } }),
      );
    });
    //TODO: move to PatchService Test Suite
    test("default selection falls back to global components when none active", async () => {
      const { db } = makeMockDb();
      const patchId = "88888888-8888-8888-8888-888888888888";
      const versionId = "99999999-9999-9999-9999-999999999999";

      db.patch.findUniqueOrThrow = jest.fn(async () => ({
        id: patchId,
        versionId,
      }));
      db.patch.findMany = jest.fn(async () => [
        { id: patchId, currentStatus: "in_development" },
      ]);
      db.releaseComponent.findMany = jest.fn(async (args: any) => {
        expect(args).toMatchObject({
          where: { releaseScope: "global" },
          select: { id: true },
        });
        return [{ id: COMPONENT_A_ID }];
      });

      const svc = new PatchService(db);
      const res = await svc.getDefaultSelection(patchId as any);

      expect(res.selectedReleaseComponentIds).toEqual([COMPONENT_A_ID]);
      expect(db.releaseComponent.findMany).toHaveBeenCalled();
    });
  });

  describe("ReleaseVersionService.updateReleaseTrack()", () => {
    test("updates the release track and logs a subaction", async () => {
      const { db } = makeMockDb();
      const svc = new ReleaseVersionService(db);
      const loggerSubactionMock = jest.fn().mockResolvedValue(undefined);
      const logger: ActionLogger = {
        subaction: loggerSubactionMock,
      } as unknown as ActionLogger;

      const result = await svc.updateReleaseTrack(
        REL_MAIN_ID,
        "Rollout",
        USER_1_ID,
        { logger },
      );

      expect(result.releaseTrack).toBe("Rollout");
      expect(db.releaseVersion.update).toHaveBeenCalledWith({
        where: { id: REL_MAIN_ID },
        data: { releaseTrack: "Rollout" },
        select: {
          id: true,
          name: true,
          releaseTrack: true,
          createdAt: true,
        },
      });
      expect(loggerSubactionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          subactionType: "releaseVersion.track.update",
          metadata: expect.objectContaining({
            from: DEFAULT_RELEASE_TRACK,
            to: "Rollout",
            releaseId: REL_MAIN_ID,
            updatedBy: USER_1_ID,
          }),
        }),
      );
    });

    test("throws NOT_FOUND when the release does not exist", async () => {
      const { db } = makeMockDb();
      db.releaseVersion.findUnique = jest.fn().mockResolvedValue(null);
      const svc = new ReleaseVersionService(db);

      await expect(
        svc.updateReleaseTrack(REL_MAIN_ID, "Active", USER_1_ID),
      ).rejects.toMatchObject({
        status: 404,
        code: "NOT_FOUND",
      });
      expect(db.releaseVersion.update).not.toHaveBeenCalled();
    });

    test("short-circuits when the release track is unchanged", async () => {
      const { db } = makeMockDb("Active");
      db.releaseVersion.findUnique = jest.fn().mockResolvedValue({
        id: REL_MAIN_ID,
        name: "Version 200",
        releaseTrack: "Active",
        createdAt: new Date(),
      });
      const svc = new ReleaseVersionService(db);

      const result = await svc.updateReleaseTrack(
        REL_MAIN_ID,
        "Active",
        USER_1_ID,
      );

      expect(result.releaseTrack).toBe("Active");
      expect(db.releaseVersion.update).not.toHaveBeenCalled();
    });
  });
});
