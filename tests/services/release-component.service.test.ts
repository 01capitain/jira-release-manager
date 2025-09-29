import type { PrismaClient } from "@prisma/client";
import { ReleaseComponentService } from "~/server/services/release-component.service";
import { ComponentVersionService } from "~/server/services/component-version.service";

const COMPONENT_A_ID = "11111111-1111-1111-1111-111111111111";
const COMPONENT_B_ID = "22222222-2222-2222-2222-222222222222";
const BUILT_VERSION_ID = "33333333-3333-3333-3333-333333333333";
const COMPONENT_VERSION_ID = "44444444-4444-4444-4444-444444444444";

type ReleaseComponentRow = {
  id: string;
  name: string;
  color: string;
  namingPattern: string;
  createdAt: Date;
};

type ReleaseComponentFindManyArgs = {
  orderBy: { createdAt: "desc" };
  select: {
    id: true;
    name: true;
    color: true;
    namingPattern: true;
    createdAt: true;
  };
};

type ReleaseComponentCreateArgs = {
  data: {
    name: string;
    color: string;
    namingPattern: string;
    createdBy: { connect: { id: string } };
  };
  select: ReleaseComponentFindManyArgs["select"];
};

type ReleaseComponentDelegate = {
  findMany: jest.Mock<Promise<ReleaseComponentRow[]>, [ReleaseComponentFindManyArgs]>;
  create: jest.Mock<Promise<ReleaseComponentRow>, [ReleaseComponentCreateArgs]>;
};

type ComponentVersionRow = {
  id: string;
  releaseComponentId: string;
  builtVersionId: string;
  name: string;
  increment: number;
  createdAt: Date;
};

type ComponentVersionFindManyArgs = {
  where: { builtVersionId: string };
  orderBy: [{ releaseComponentId: "asc" }, { increment: "asc" }];
  select: {
    id: true;
    releaseComponentId: true;
    builtVersionId: true;
    name: true;
    increment: true;
    createdAt: true;
  };
};

type ComponentVersionDelegate = {
  findMany: jest.Mock<Promise<ComponentVersionRow[]>, [ComponentVersionFindManyArgs]>;
};

describe("ReleaseComponentService", () => {
  test("list returns mapped DTOs", async () => {
    const createdAt = new Date("2024-03-01T12:00:00Z");
    const releaseComponentDelegate: ReleaseComponentDelegate = {
      findMany: jest.fn<Promise<ReleaseComponentRow[]>, [ReleaseComponentFindManyArgs]>(
        async () => [
          {
            id: COMPONENT_A_ID,
            name: "Component A",
            color: "blue",
            namingPattern: "{release_version}-{built_version}-{increment}",
            createdAt,
          },
        ],
      ),
      create: jest.fn<Promise<ReleaseComponentRow>, [ReleaseComponentCreateArgs]>(),
    };
    const db = { releaseComponent: releaseComponentDelegate } as unknown as PrismaClient;

    const svc = new ReleaseComponentService(db);
    const res = await svc.list();

    expect(releaseComponentDelegate.findMany).toHaveBeenCalledWith({
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
    const releaseComponentDelegate: ReleaseComponentDelegate = {
      findMany: jest.fn<Promise<ReleaseComponentRow[]>, [ReleaseComponentFindManyArgs]>(),
      create: jest.fn<Promise<ReleaseComponentRow>, [ReleaseComponentCreateArgs]>(
        async (args) => ({
          id: COMPONENT_B_ID,
          name: args.data.name,
          color: args.data.color,
          namingPattern: args.data.namingPattern,
          createdAt,
        }),
      ),
    };
    const db = { releaseComponent: releaseComponentDelegate } as unknown as PrismaClient;

    const svc = new ReleaseComponentService(db);
    const res = await svc.create("user-1", {
      name: "  Component B  ",
      color: "red",
      namingPattern: "  {release_version}-{increment}  ",
    });

    expect(releaseComponentDelegate.create).toHaveBeenCalledWith({
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
    const componentVersionDelegate: ComponentVersionDelegate = {
      findMany: jest.fn<Promise<ComponentVersionRow[]>, [ComponentVersionFindManyArgs]>(
        async () => [
          {
            id: COMPONENT_VERSION_ID,
            releaseComponentId: COMPONENT_A_ID,
            builtVersionId: BUILT_VERSION_ID,
            name: "component-a-0",
            increment: 0,
            createdAt,
          },
        ],
      ),
    };
    const db = { componentVersion: componentVersionDelegate } as unknown as PrismaClient;

    const svc = new ComponentVersionService(db);
    const res = await svc.listByBuilt(BUILT_VERSION_ID);

    expect(componentVersionDelegate.findMany).toHaveBeenCalledWith({
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
