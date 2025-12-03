import type { PrismaClient } from "@prisma/client";
import {
  releaseComponentFixtures,
  toReleaseComponentDbRow,
} from "../fixtures/release-components";
import { userFixtures } from "../fixtures/users";
import { ReleaseComponentService } from "~/server/services/release-component.service";

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
    expect(res).toEqual([toReleaseComponentDbRow(iosFixture)]);
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
      namingPattern: "  app.android.{patch}  ",
      releaseScope: "global",
    });

    expect(releaseComponentDelegate.create).toHaveBeenCalledWith({
      data: {
        name: "Android App",
        color: "emerald",
        namingPattern: "app.android.{patch}",
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

    expect(res).toEqual(
      toReleaseComponentDbRow(androidFixture, {
        name: "Android App",
        color: "emerald",
        namingPattern: "app.android.{patch}",
      }),
    );
  });
});
