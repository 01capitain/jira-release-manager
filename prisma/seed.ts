import { PrismaClient, type Prisma } from "@prisma/client";

import {
  releaseComponentFixtureList,
  releaseComponentFixtures,
} from "../tests/fixtures/release-components";
import { releaseVersionFixtureList } from "../tests/fixtures/release-versions";
import { userFixtureList } from "../tests/fixtures/users";
import { expandPattern } from "~/server/services/component-version-naming.service";
import { SEED_PLACEHOLDER_USER } from "~/server/seed/constants";

const prisma = new PrismaClient();
type SeedClient = PrismaClient | Prisma.TransactionClient;

type DbReleaseComponentScope = "global" | "version_bound";
type DbBuiltStatus =
  | "in_development"
  | "in_deployment"
  | "active"
  | "deprecated";
type DbBuiltAction =
  | "start_deployment"
  | "mark_active"
  | "deprecate"
  | "cancel_deployment"
  | "reactivate"
  | "revert_to_deployment";

const RELEASE_COMPONENT_IDS = releaseComponentFixtureList.map(
  (fixture) => fixture.id,
);
const RELEASE_VERSION_IDS = releaseVersionFixtureList.map(
  (fixture) => fixture.id,
);
const BUILT_VERSION_IDS = releaseVersionFixtureList.flatMap((fixture) =>
  fixture.builtVersions.map((built) => built.id),
);
const USER_IDS = [
  SEED_PLACEHOLDER_USER.id,
  ...userFixtureList.map((fixture) => fixture.id),
];

const TransitionChains: Record<
  DbBuiltStatus,
  Array<{ action: DbBuiltAction; from: DbBuiltStatus; to: DbBuiltStatus }>
> = {
  in_development: [],
  in_deployment: [
    {
      action: "start_deployment",
      from: "in_development",
      to: "in_deployment",
    },
  ],
  active: [
    {
      action: "start_deployment",
      from: "in_development",
      to: "in_deployment",
    },
    { action: "mark_active", from: "in_deployment", to: "active" },
  ],
  deprecated: [
    {
      action: "start_deployment",
      from: "in_development",
      to: "in_deployment",
    },
    { action: "mark_active", from: "in_deployment", to: "active" },
    { action: "deprecate", from: "active", to: "deprecated" },
  ],
};

function assertDevelopmentEnv() {
  const env = process.env.NODE_ENV ?? "";
  if (env !== "development") {
    throw new Error(
      `Seeds can only run in development. NODE_ENV=${env || "(unset)"}`,
    );
  }
}

async function cleanup(tx: SeedClient) {
  await tx.componentVersion.deleteMany({
    where: { releaseComponentId: { in: RELEASE_COMPONENT_IDS } },
  });
  await tx.builtVersionTransition.deleteMany({
    where: {
      builtVersion: {
        versionId: { in: RELEASE_VERSION_IDS },
      },
    },
  });
  await tx.builtVersion.deleteMany({
    where: { versionId: { in: RELEASE_VERSION_IDS } },
  });
  await tx.releaseVersion.deleteMany({
    where: { id: { in: RELEASE_VERSION_IDS } },
  });
  await tx.releaseComponent.deleteMany({
    where: { id: { in: RELEASE_COMPONENT_IDS } },
  });
  await tx.user.deleteMany({
    where: { id: { in: USER_IDS } },
  });
}

async function seedUsers(tx: SeedClient) {
  await tx.user.create({
    data: {
      id: SEED_PLACEHOLDER_USER.id,
      name: SEED_PLACEHOLDER_USER.name,
      email: SEED_PLACEHOLDER_USER.email,
    },
  });

  for (const user of userFixtureList) {
    await tx.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email ?? null,
      },
    });
  }
}

async function seedReleaseComponents(tx: SeedClient) {
  for (const component of releaseComponentFixtureList) {
    await tx.releaseComponent.create({
      data: {
        id: component.id,
        name: component.name,
        color: component.color,
        namingPattern: component.namingPattern,
        releaseScope: toDbScope(component.releaseScope),
        createdAt: new Date(component.createdAt),
        createdById: SEED_PLACEHOLDER_USER.id,
      },
    });
  }
}

async function seedReleaseVersions(tx: SeedClient) {
  const componentMap = new Map(
    Object.values(releaseComponentFixtures).map((fixture) => [
      fixture.id,
      fixture,
    ]),
  );

  for (const version of releaseVersionFixtureList) {
    const lastUsedIncrement = version.builtVersions.reduce(
      (max, built) => Math.max(max, built.increment),
      -1,
    );
    const release = await tx.releaseVersion.create({
      data: {
        id: version.id,
        name: version.name,
        lastUsedIncrement,
        createdAt: new Date(version.createdAt),
        createdById: SEED_PLACEHOLDER_USER.id,
      },
    });

    const componentCounters = new Map<string, number>();
    const builtVersions = [...version.builtVersions].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );

    for (const built of builtVersions) {
      const builtRow = await tx.builtVersion.create({
        data: {
          id: built.id,
          name: built.name,
          versionId: release.id,
          createdAt: new Date(built.createdAt),
          createdById: SEED_PLACEHOLDER_USER.id,
          tokenValues: {
            release_version: version.name,
            increment: built.increment,
          } satisfies Prisma.InputJsonValue,
        },
      });

      for (const componentId of built.releaseComponentIds) {
        const component = componentMap.get(componentId);
        if (!component?.namingPattern) continue;
        const nextIncrement = (componentCounters.get(componentId) ?? -1) + 1;
        componentCounters.set(componentId, nextIncrement);
        await tx.componentVersion.create({
          data: {
            releaseComponentId: componentId,
            builtVersionId: builtRow.id,
            name: expandPattern(component.namingPattern, {
              releaseVersion: version.name,
              builtVersion: builtRow.name,
              nextIncrement,
            }),
            increment: nextIncrement,
            createdAt: new Date(built.createdAt),
            tokenValues: {
              release_version: version.name,
              built_version: builtRow.name,
              increment: nextIncrement,
            } satisfies Prisma.InputJsonValue,
          },
        });
      }

      const transitions = TransitionChains[built.status as DbBuiltStatus] ?? [];
      for (const [index, transition] of transitions.entries()) {
        await tx.builtVersionTransition.create({
          data: {
            builtVersionId: builtRow.id,
            fromStatus: transition.from,
            toStatus: transition.to,
            action: transition.action,
            createdAt: new Date(
              new Date(built.createdAt).getTime() + (index + 1) * 1000,
            ),
            createdById: SEED_PLACEHOLDER_USER.id,
          },
        });
      }
    }
  }
}

function toDbScope(scope: "global" | "version-bound"): DbReleaseComponentScope {
  return scope === "version-bound" ? "version_bound" : "global";
}

async function main() {
  assertDevelopmentEnv();
  console.log("Resetting fixture data...");
  await prisma.$transaction(async (tx) => {
    await cleanup(tx);
    await seedUsers(tx);
    await seedReleaseComponents(tx);
    await seedReleaseVersions(tx);
  });
  console.log("Seeded release fixtures");
}

main()
  .catch((err) => {
    console.error("Failed to seed fixtures");
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
