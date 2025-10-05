/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { ReleaseVersionService } from "~/server/services/release-version.service";
import { BuiltVersionService } from "~/server/services/built-version.service";
import { BuiltVersionStatusService } from "~/server/services/built-version-status.service";

const COMPONENT_A_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const COMPONENT_B_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const BUILT_VERSION_LIST_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const ACTIVE_BUILT_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const NEWER_BUILT_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";

// Minimal Prisma-like client mock with only fields used in tests
function makeMockDb() {
  const calls: Record<string, unknown[]> = {};
  const record = (key: string, payload: unknown) => {
    calls[key] = calls[key] ?? [];
    calls[key].push(payload);
  };

  const REL_ID = "11111111-1111-1111-1111-111111111111";
  let builtAutoInc = 0;
  const makeUuid = (n: number) => {
    const hex = n.toString(16).padStart(12, "0");
    return `00000000-0000-0000-0000-${hex}`;
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
      findMany: jest.fn(async () => {
        record("releaseComponent.findMany", {});
        return [
          {
            id: COMPONENT_A_ID,
            namingPattern: "{release_version}-{built_version}-{increment}",
          },
          {
            id: COMPONENT_B_ID,
            namingPattern: "{release_version}-{built_version}-{increment}",
          },
        ];
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
  test("creating a release creates an initial builtVersion named *.0 and component versions", async () => {
    const { db, calls } = makeMockDb();
    // Mock Release name when looked up by BuiltVersionService
    db.releaseVersion.findUniqueOrThrow = jest.fn(async () => ({
      id: "11111111-1111-1111-1111-111111111111",
      name: "version 100",
    }));

    const svc = new ReleaseVersionService(db);
    await svc.create("user-1" as any, "version 100");

    // builtVersion created alongside
    expect(db.builtVersion.create).toHaveBeenCalled();
    const builtCalls = calls["builtVersion.create"] ?? [];
    const builtArgs = builtCalls[0] as any;
    expect(builtArgs).toBeDefined();
    expect(builtArgs?.data?.name).toBe("version 100.0"); // ends with .0

    // component versions created for each existing release component (2)
    expect(db.componentVersion.create).toHaveBeenCalledTimes(2);
  });

  test("creating a builtVersion creates component versions for each release component", async () => {
    const { db } = makeMockDb();
    const REL2 = "22222222-2222-2222-2222-222222222222";
    db.releaseVersion.findUniqueOrThrow = jest.fn(async () => ({
      id: REL2,
      name: "version 200",
    }));
    const bsvc = new BuiltVersionService(db);
    await bsvc.create("user-1" as any, REL2 as any, "version 200.0");
    // Two components → two component versions
    expect(db.componentVersion.create).toHaveBeenCalledTimes(2);
  });

  test("transition to in_deployment creates a successor with higher increment", async () => {
    const { db, calls } = makeMockDb();
    const createdAt = new Date("2024-01-01T00:00:00Z");
    db.builtVersion.findUnique = jest.fn(async () => ({
      id: "33333333-3333-3333-3333-333333333333",
      name: "version 300.0",
      versionId: "11111111-1111-1111-1111-111111111111",
      createdAt,
    }));
    db.releaseVersion.findUnique = jest.fn(async () => ({
      id: "11111111-1111-1111-1111-111111111111",
      name: "version 300",
      lastUsedIncrement: 0,
    }));
    db.builtVersion.findFirst = jest.fn(async () => null); // no newer exists

    const ssvc = new BuiltVersionStatusService(db);
    const res = await ssvc.transition(
      "33333333-3333-3333-3333-333333333333" as any,
      "startDeployment",
      "user-1" as any,
    );
    expect(res.status).toBe("in_deployment");
    expect(res.builtVersion).toMatchObject({
      id: "33333333-3333-3333-3333-333333333333",
      name: "version 300.0",
      versionId: "11111111-1111-1111-1111-111111111111",
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
      id: "44444444-4444-4444-4444-444444444444",
      name: "version 400.0",
      versionId: "11111111-1111-1111-1111-111111111111",
      createdAt,
    }));
    db.releaseVersion.findUnique = jest.fn(async () => ({
      id: "11111111-1111-1111-1111-111111111111",
      name: "version 400",
      lastUsedIncrement: 1,
    }));
    // Simulate a newer build existing
    db.builtVersion.findFirst = jest.fn(async () => ({ id: NEWER_BUILT_ID }));

    const ssvc = new BuiltVersionStatusService(db);
    await ssvc.transition(
      "44444444-4444-4444-4444-444444444444" as any,
      "startDeployment",
      "user-1" as any,
    );
    // ensure builtVersion.create was NOT called
    expect(db.builtVersion.create).not.toHaveBeenCalled();
    // ensure no component versions were created either
    expect(db.componentVersion.create).not.toHaveBeenCalled();
  });

  test("listByRelease maps rows to DTOs", async () => {
    const { db } = makeMockDb();
    const versionId = "55555555-5555-5555-5555-555555555555";
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
    db.componentVersion.findMany = jest.fn(async () => [
      { releaseComponentId: COMPONENT_A_ID },
      { releaseComponentId: COMPONENT_B_ID },
      { releaseComponentId: COMPONENT_A_ID },
    ]);

    const svc = new BuiltVersionService(db);
    const res = await svc.getDefaultSelection(builtVersionId as any);

    expect(res.selectedReleaseComponentIds).toEqual([
      COMPONENT_A_ID,
      COMPONENT_B_ID,
    ]);
    expect(db.componentVersion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { builtVersionId: activeBuiltId } }),
    );
  });

  test("default selection falls back to all components when none active", async () => {
    const { db } = makeMockDb();
    const builtVersionId = "88888888-8888-8888-8888-888888888888";
    const versionId = "99999999-9999-9999-9999-999999999999";

    db.builtVersion.findUniqueOrThrow = jest.fn(async () => ({
      id: builtVersionId,
      versionId,
    }));
    db.builtVersion.findMany = jest.fn(async () => [{ id: builtVersionId }]);
    db.builtVersionTransition.findMany = jest.fn(async () => []);
    db.releaseComponent.findMany = jest.fn(async () => [
      { id: COMPONENT_A_ID },
      { id: COMPONENT_B_ID },
    ]);

    const svc = new BuiltVersionService(db);
    const res = await svc.getDefaultSelection(builtVersionId as any);

    expect(res.selectedReleaseComponentIds).toEqual([
      COMPONENT_A_ID,
      COMPONENT_B_ID,
    ]);
    expect(db.releaseComponent.findMany).toHaveBeenCalled();
  });
});
