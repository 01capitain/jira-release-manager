import { ReleaseVersionService } from "~/server/services/release-version.service";
import { BuiltVersionService } from "~/server/services/built-version.service";
import { BuiltVersionStatusService } from "~/server/services/built-version-status.service";

// Minimal Prisma-like client mock with only fields used in tests
function makeMockDb() {
  const calls: Record<string, unknown[]> = {};
  const record = (key: string, payload: unknown) => {
    calls[key] = calls[key] ?? [];
    calls[key]!.push(payload);
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
        return { id: args.where.id, lastUsedIncrement: args.data.lastUsedIncrement };
      }),
      findUnique: jest.fn(),
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
      findUniqueOrThrow: jest.fn(async (args: any) => ({ id: args.where.id })),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    // ReleaseComponent
    releaseComponent: {
      findMany: jest.fn(async () => {
        record("releaseComponent.findMany", {});
        return [
          { id: "comp-a", namingPattern: "{release_version}-{built_version}-{increment}" },
          { id: "comp-b", namingPattern: "{release_version}-{built_version}-{increment}" },
        ];
      }),
    },
    // ComponentVersion
    componentVersion: {
      create: jest.fn(async (args: any) => {
        record("componentVersion.create", args);
        const id = `cv-${(calls["componentVersion.create"]?.length ?? 0)}`;
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
    db.releaseVersion.findUniqueOrThrow = jest.fn(async () => ({ id: "11111111-1111-1111-1111-111111111111", name: "version 100" }));

    const svc = new ReleaseVersionService(db as any);
    await svc.create("user-1" as any, "version 100");

    // builtVersion created alongside
    expect(db.builtVersion.create).toHaveBeenCalled();
    const builtArgs = calls["builtVersion.create"][0] as any;
    expect(builtArgs.data.name).toBe("version 100.0"); // ends with .0

    // component versions created for each existing release component (2)
    expect(db.componentVersion.create).toHaveBeenCalledTimes(2);
  });

  test("creating a builtVersion creates component versions for each release component", async () => {
    const { db } = makeMockDb();
    const REL2 = "22222222-2222-2222-2222-222222222222";
    db.releaseVersion.findUniqueOrThrow = jest.fn(async () => ({ id: REL2, name: "version 200" }));
    const bsvc = new BuiltVersionService(db as any);
    await bsvc.create("user-1" as any, REL2 as any, "version 200.0");
    // Two components → two component versions
    expect(db.componentVersion.create).toHaveBeenCalledTimes(2);
  });

  test("transition to in_deployment creates a successor with higher increment", async () => {
    const { db, calls } = makeMockDb();
    const createdAt = new Date("2024-01-01T00:00:00Z");
    db.builtVersion.findUnique = jest.fn(async () => ({ id: "33333333-3333-3333-3333-333333333333", name: "version 300.0", versionId: "11111111-1111-1111-1111-111111111111", createdAt }));
    db.releaseVersion.findUnique = jest.fn(async () => ({ id: "11111111-1111-1111-1111-111111111111", name: "version 300", lastUsedIncrement: 0 }));
    db.builtVersion.findFirst = jest.fn(async () => null); // no newer exists

    const ssvc = new BuiltVersionStatusService(db as any);
    const res = await ssvc.transition("33333333-3333-3333-3333-333333333333" as any, "startDeployment", "user-1" as any);
    expect(res.status).toBe("in_deployment");

    // Successor created with next increment (1)
    const succ = calls["builtVersion.create"][0] as any;
    expect(succ.data.name).toBe("version 300.1");
  });

  test("no successor is created if a newer built already exists", async () => {
    const { db } = makeMockDb();
    const createdAt = new Date("2024-01-01T00:00:00Z");
    db.builtVersion.findUnique = jest.fn(async () => ({ id: "44444444-4444-4444-4444-444444444444", name: "version 400.0", versionId: "11111111-1111-1111-1111-111111111111", createdAt }));
    db.releaseVersion.findUnique = jest.fn(async () => ({ id: "11111111-1111-1111-1111-111111111111", name: "version 400", lastUsedIncrement: 1 }));
    // Simulate a newer build existing
    db.builtVersion.findFirst = jest.fn(async () => ({ id: "built-NEWER" }));

    const ssvc = new BuiltVersionStatusService(db as any);
    await ssvc.transition("44444444-4444-4444-4444-444444444444" as any, "startDeployment", "user-1" as any);
    // ensure builtVersion.create was NOT called
    expect(db.builtVersion.create).not.toHaveBeenCalled();
    // ensure no component versions were created either
    expect(db.componentVersion.create).not.toHaveBeenCalled();
  });
});
