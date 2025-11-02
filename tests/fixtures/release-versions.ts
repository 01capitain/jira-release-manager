import { releaseComponentFixtures } from "./release-components";
import { userFixtures } from "./users";

type ReleaseVersionFixtureData = {
  id: string;
  name: string;
  createdAt: string;
  createdById: string;
  builtVersions: Array<{
    id: string;
    name: string;
    versionId: string;
    createdAt: string;
    increment: number;
    status: "in_development" | "in_deployment" | "active" | "deprecated";
    releaseComponentIds: string[];
  }>;
};

const RELEASE_VERSIONS = {
  version177: {
    id: "018f1a50-0000-7000-9000-000000000301",
    name: "177",
    createdAt: "2025-01-05T09:00:00.000Z",
    createdById: userFixtures.adamScott.id,
    builtVersions: [
      {
        id: "018f1a50-0000-7000-9000-000000000311",
        name: "177.0",
        versionId: "018f1a50-0000-7000-9000-000000000301",
        createdAt: "2025-01-05T09:15:00.000Z",
        increment: 0,
        status: "deprecated",
        releaseComponentIds: [
          releaseComponentFixtures.iosApp.id,
          releaseComponentFixtures.androidApp.id,
        ],
      },
      {
        id: "018f1a50-0000-7000-9000-000000000312",
        name: "177.1",
        versionId: "018f1a50-0000-7000-9000-000000000301",
        createdAt: "2025-01-06T08:00:00.000Z",
        increment: 1,
        status: "active",
        releaseComponentIds: [
          releaseComponentFixtures.iosApp.id,
          releaseComponentFixtures.androidApp.id,
          releaseComponentFixtures.globalAdminPhp.id,
          releaseComponentFixtures.nestJsBackend.id,
        ],
      },
      {
        id: "018f1a50-0000-7000-9000-000000000313",
        name: "177.2",
        versionId: "018f1a50-0000-7000-9000-000000000301",
        createdAt: "2025-01-08T10:30:00.000Z",
        increment: 2,
        status: "in_development",
        releaseComponentIds: [
          releaseComponentFixtures.desktopAngular.id,
          releaseComponentFixtures.desktopAngularJs.id,
          releaseComponentFixtures.phpBackend.id,
        ],
      },
    ],
  },
  version26_1: {
    id: "018f1a50-0000-7000-9000-000000000302",
    name: "26.1",
    createdAt: "2025-02-12T11:45:00.000Z",
    createdById: userFixtures.melanieMayer.id,
    builtVersions: [
      {
        id: "018f1a50-0000-7000-9000-000000000321",
        name: "26.1.0",
        versionId: "018f1a50-0000-7000-9000-000000000302",
        createdAt: "2025-02-12T12:00:00.000Z",
        increment: 0,
        status: "in_development",
        releaseComponentIds: [
          releaseComponentFixtures.iosApp.id,
          releaseComponentFixtures.desktopAngular.id,
        ],
      },
    ],
  },
} satisfies Record<string, ReleaseVersionFixtureData>;

export type ReleaseVersionFixtureKey = keyof typeof RELEASE_VERSIONS;
export type ReleaseVersionFixtureStub =
  (typeof RELEASE_VERSIONS)[ReleaseVersionFixtureKey];

export const releaseVersionFixtures = Object.freeze(RELEASE_VERSIONS) as Record<
  ReleaseVersionFixtureKey,
  ReleaseVersionFixtureStub
>;

export const releaseVersionFixtureList = Object.freeze(
  Object.values(releaseVersionFixtures),
);
