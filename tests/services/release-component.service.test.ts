import type { PrismaClient } from "@prisma/client";
import {
  releaseComponentFixtures,
  toReleaseComponentDbRow,
} from "../fixtures/release-components";
import { userFixtures } from "../fixtures/users";
import { ReleaseComponentService } from "~/server/services/release-component.service";
import { ComponentVersionService } from "~/server/services/component-version.service";

const COMPONENT_A_ID = releaseComponentFixtures.iosApp.id;
const BUILT_VERSION_ID = "00000000-0000-7000-8000-000000000003";
const COMPONENT_VERSION_ID = "00000000-0000-7000-8000-000000000004";

type ReleaseComponentRow = {
  id: string;
  name: string;
  color: string;
  namingPattern: string;
  releaseScope: "version_bound" | "global";
  createdAt: Date;
};

type ReleaseComponentFindManyArgs = {
  orderBy: { createdAt: "desc" };
  select: {
    id: true;
    name: true;
    color: true;
    namingPattern: true;
    releaseScope: true;
    createdAt: true;
  };
};

type ReleaseComponentCreateArgs = {
  data: {
    name: string;
    color: string;
    namingPattern: string;
    releaseScope: "version_bound" | "global";
    createdBy: { connect: { id: string } };
  };
  select: ReleaseComponentFindManyArgs["select"];
};

type ReleaseComponentDelegate = {
  findMany: jest.Mock<
    Promise<ReleaseComponentRow[]>,
    [ReleaseComponentFindManyArgs]
  >;
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
  findMany: jest.Mock<
    Promise<ComponentVersionRow[]>,
    [ComponentVersionFindManyArgs]
  >;
};

describe("ReleaseComponentService", () => {
  test("list returns mapped DTOs", async () => {
    const iosFixture = releaseComponentFixtures.iosApp;
    const releaseComponentDelegate: ReleaseComponentDelegate = {
      findMany: jest.fn<
        Promise<ReleaseComponentRow[]>,
        [ReleaseComponentFindManyArgs]
      >(async () => [toReleaseComponentDbRow(iosFixture)]),
      create: jest.fn<
        Promise<ReleaseComponentRow>,
        [ReleaseComponentCreateArgs]
      >(),
    };
    const db = {
      releaseComponent: releaseComponentDelegate,
    } as unknown as PrismaClient;

    const svc = new ReleaseComponentService(db);
    const res = await svc.list();

    expect(releaseComponentDelegate.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        color: true,
        namingPattern: true,
        releaseScope: true,
        createdAt: true,
      },
    });
    expect(res).toEqual([
      {
        ...iosFixture,
      },
    ]);
  });

  test("create trims fields and returns DTO", async () => {
    const androidFixture = releaseComponentFixtures.androidApp;
    const releaseComponentDelegate: ReleaseComponentDelegate = {
      findMany: jest.fn<
        Promise<ReleaseComponentRow[]>,
        [ReleaseComponentFindManyArgs]
      >(),
      create: jest.fn<
        Promise<ReleaseComponentRow>,
        [ReleaseComponentCreateArgs]
      >(async (args) =>
        toReleaseComponentDbRow(androidFixture, {
          name: args.data.name,
          color: args.data.color,
          namingPattern: args.data.namingPattern,
          releaseScope: args.data.releaseScope,
        }),
      ),
    };
    const db = {
      releaseComponent: releaseComponentDelegate,
    } as unknown as PrismaClient;

    const svc = new ReleaseComponentService(db);
    const res = await svc.create(userFixtures.adamScott.id, {
      name: "  Android App  ",
      color: "emerald",
      namingPattern: "  app.android.{built_version}  ",
      releaseScope: "global",
    });

    expect(releaseComponentDelegate.create).toHaveBeenCalledWith({
      data: {
        name: "Android App",
        color: "emerald",
        namingPattern: "app.android.{built_version}",
        releaseScope: "global",
        createdBy: { connect: { id: userFixtures.adamScott.id } },
      },
      select: {
        id: true,
        name: true,
        color: true,
        namingPattern: true,
        releaseScope: true,
        createdAt: true,
      },
    });

    expect(res).toEqual({
      ...androidFixture,
      name: "Android App",
      color: "emerald",
      namingPattern: "app.android.{built_version}",
    });
  });
});

describe("ComponentVersionService", () => {
  test("listByBuilt maps rows to DTOs", async () => {
    const createdAt = new Date("2024-04-01T09:15:00Z");
    const componentVersionDelegate: ComponentVersionDelegate = {
      findMany: jest.fn<
        Promise<ComponentVersionRow[]>,
        [ComponentVersionFindManyArgs]
      >(async () => [
        {
          id: COMPONENT_VERSION_ID,
          releaseComponentId: COMPONENT_A_ID,
          builtVersionId: BUILT_VERSION_ID,
          name: "component-a-0",
          increment: 0,
          createdAt,
        },
      ]),
    };
    const db = {
      componentVersion: componentVersionDelegate,
    } as unknown as PrismaClient;

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
