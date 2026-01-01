import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type {
  Prisma,
  ReleaseTrack as PrismaReleaseTrack,
} from "@prisma/client";

import {
  releaseComponentFixtureList,
  releaseComponentFixtures,
} from "../tests/fixtures/release-components";
import { releaseVersionFixtureList } from "../tests/fixtures/release-versions";
import type { ReleaseVersionFixtureStub } from "../tests/fixtures/release-versions";
import { userFixtureList } from "../tests/fixtures/users";
import { DEFAULT_DATABASE_URL } from "../src/config/database";
import { expandPattern } from "~/server/services/component-version-naming.service";
import { SEED_PLACEHOLDER_USER } from "~/server/seed/constants";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });
type SeedClient = PrismaClient | Prisma.TransactionClient;

type DbReleaseComponentScope = "global" | "version_bound";
type DbPatchStatus =
  | "in_development"
  | "in_deployment"
  | "active"
  | "deprecated";
type DbReleaseTrack = PrismaReleaseTrack;
type DbPatchAction =
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
const USER_IDS = [
  SEED_PLACEHOLDER_USER.id,
  ...userFixtureList.map((fixture) => fixture.id),
];

const TransitionChains: Record<
  DbPatchStatus,
  Array<{ action: DbPatchAction; from: DbPatchStatus; to: DbPatchStatus }>
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

function toDbReleaseTrack(
  track: ReleaseVersionFixtureStub["releaseTrack"],
): DbReleaseTrack {
  switch (track) {
    case "Future":
      return "Future";
    case "Beta":
      return "Beta";
    case "Rollout":
      return "Rollout";
    case "Active":
      return "Active";
    case "Archived":
      return "Archived";
    default:
      throw new Error(`Unknown release track fixture value: ${String(track)}`);
  }
}

async function cleanup(tx: SeedClient) {
  await tx.componentVersion.deleteMany({
    where: { releaseComponentId: { in: RELEASE_COMPONENT_IDS } },
  });
  await tx.patchTransition.deleteMany({
    where: {
      patch: {
        versionId: { in: RELEASE_VERSION_IDS },
      },
    },
  });
  await tx.patch.deleteMany({
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
  const releaseFixtures: readonly ReleaseVersionFixtureStub[] =
    releaseVersionFixtureList;
  const releaseTrackOverrides = new Map<string, DbReleaseTrack>();
  for (const fixture of releaseFixtures) {
    if (fixture.releaseTrack !== undefined) {
      releaseTrackOverrides.set(
        fixture.id,
        toDbReleaseTrack(fixture.releaseTrack),
      );
    }
  }

  for (const version of releaseFixtures) {
    const lastUsedIncrement = version.patches.reduce(
      (max, patch) => Math.max(max, patch.increment),
      -1,
    );
    const release = await tx.releaseVersion.create({
      data: {
        id: version.id,
        name: version.name,
        lastUsedIncrement,
        // Fixture metadata already validated when populating releaseTrackOverrides.

        releaseTrack: releaseTrackOverrides.get(version.id) ?? "Future",
        createdAt: new Date(version.createdAt),
        createdById: SEED_PLACEHOLDER_USER.id,
      },
    });

    const componentCounters = new Map<string, number>();
    const patches = [...version.patches].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );

    for (const patch of patches) {
      const patchRow = await tx.patch.create({
        data: {
          id: patch.id,
          name: patch.name,
          versionId: release.id,
          createdAt: new Date(patch.createdAt),
          createdById: SEED_PLACEHOLDER_USER.id,
          currentStatus: patch.status as DbPatchStatus,
          tokenValues: {
            release_version: version.name,
            increment: patch.increment,
          } satisfies Prisma.InputJsonValue,
        },
      });

      for (const componentId of patch.releaseComponentIds) {
        const component = componentMap.get(componentId);
        if (!component?.namingPattern) continue;
        const nextIncrement = (componentCounters.get(componentId) ?? -1) + 1;
        componentCounters.set(componentId, nextIncrement);
        await tx.componentVersion.create({
          data: {
            releaseComponentId: componentId,
            patchId: patchRow.id,
            name: expandPattern(component.namingPattern, {
              releaseVersion: version.name,
              patch: patchRow.name,
              nextIncrement,
            }),
            increment: nextIncrement,
            createdAt: new Date(patch.createdAt),
            tokenValues: {
              release_version: version.name,
              patch: patchRow.name,
              increment: nextIncrement,
            } satisfies Prisma.InputJsonValue,
          },
        });
      }

      const transitions = TransitionChains[patch.status as DbPatchStatus] ?? [];
      for (const [index, transition] of transitions.entries()) {
        await tx.patchTransition.create({
          data: {
            patchId: patchRow.id,
            fromStatus: transition.from,
            toStatus: transition.to,
            action: transition.action,
            createdAt: new Date(
              new Date(patch.createdAt).getTime() + (index + 1) * 1000,
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
