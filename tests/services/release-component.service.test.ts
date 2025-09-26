/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReleaseComponentService } from "~/server/services/release-component.service";
import { ComponentVersionService } from "~/server/services/component-version.service";

const COMPONENT_A_ID = "11111111-1111-1111-1111-111111111111";
const COMPONENT_B_ID = "22222222-2222-2222-2222-222222222222";
const BUILT_VERSION_ID = "33333333-3333-3333-3333-333333333333";
const COMPONENT_VERSION_ID = "44444444-4444-4444-4444-444444444444";

describe("ReleaseComponentService", () => {
  test("list returns mapped DTOs", async () => {
    const createdAt = new Date("2024-03-01T12:00:00Z");
    const db: any = {
      releaseComponent: {
        findMany: jest.fn(async () => [
          {
            id: COMPONENT_A_ID,
            name: "Component A",
            color: "blue",
            namingPattern: "{release_version}-{built_version}-{increment}",
            createdAt,
          },
        ]),
      },
    };

    const svc = new ReleaseComponentService(db);
    const res = await svc.list();

    expect(db.releaseComponent.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        color: true,
        namingPattern: true,
        createdAt: true,
      },
    });
    expect(res).toEqual([
      {
        id: COMPONENT_A_ID,
        name: "Component A",
        color: "blue",
        namingPattern: "{release_version}-{built_version}-{increment}",
        createdAt: createdAt.toISOString(),
      },
    ]);
  });

  test("create trims fields and returns DTO", async () => {
    const createdAt = new Date("2024-03-02T08:30:00Z");
    const db: any = {
      releaseComponent: {
        create: jest.fn(async (args: any) => {
          return {
            id: COMPONENT_B_ID,
            name: args.data.name,
            color: args.data.color,
            namingPattern: args.data.namingPattern,
            createdAt,
          };
        }),
      },
    };

    const svc = new ReleaseComponentService(db);
    const res = await svc.create("user-1" as any, {
      name: "  Component B  ",
      color: "red",
      namingPattern: "  {release_version}-{increment}  ",
    });

    expect(db.releaseComponent.create).toHaveBeenCalledWith({
      data: {
        name: "Component B",
        color: "red",
        namingPattern: "{release_version}-{increment}",
        createdBy: { connect: { id: "user-1" } },
      },
      select: {
        id: true,
        name: true,
        color: true,
        namingPattern: true,
        createdAt: true,
      },
    });

    expect(res).toEqual({
      id: COMPONENT_B_ID,
      name: "Component B",
      color: "red",
      namingPattern: "{release_version}-{increment}",
      createdAt: createdAt.toISOString(),
    });
  });
});

describe("ComponentVersionService", () => {
  test("listByBuilt maps rows to DTOs", async () => {
    const createdAt = new Date("2024-04-01T09:15:00Z");
    const db: any = {
      componentVersion: {
        findMany: jest.fn(async () => [
          {
            id: COMPONENT_VERSION_ID,
            releaseComponentId: COMPONENT_A_ID,
            builtVersionId: BUILT_VERSION_ID,
            name: "component-a-0",
            increment: 0,
            createdAt,
          },
        ]),
      },
    };

    const svc = new ComponentVersionService(db);
    const res = await svc.listByBuilt(BUILT_VERSION_ID as any);

    expect(db.componentVersion.findMany).toHaveBeenCalledWith({
      where: { builtVersionId: BUILT_VERSION_ID },
      orderBy: [{ releaseComponentId: "asc" }, { increment: "asc" }],
      select: {
        id: true,
        releaseComponentId: true,
        builtVersionId: true,
        name: true,
        increment: true,
        createdAt: true,
      },
    });
    expect(res).toEqual([
      {
        id: COMPONENT_VERSION_ID,
        releaseComponentId: COMPONENT_A_ID,
        builtVersionId: BUILT_VERSION_ID,
        name: "component-a-0",
        increment: 0,
        createdAt: createdAt.toISOString(),
      },
    ]);
  });
});
