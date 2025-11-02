import type { ISO8601 } from "~/shared/types/iso8601";
import type { ReleaseComponentDto } from "~/shared/types/release-component";
import type { UuidV7 } from "~/shared/types/uuid";

type ReleaseComponentFixtureBase = {
  id: ReleaseComponentDto["id"];
  name: string;
  color: string;
  namingPattern: string;
  releaseScope: ReleaseComponentDto["releaseScope"];
  createdAt: ReleaseComponentDto["createdAt"];
};

const RELEASE_COMPONENT_FIXTURES = {
  iosApp: {
    id: "018f1a50-0000-7000-8000-000000000101" as UuidV7,
    name: "iOS App",
    color: "violet",
    namingPattern: "app.ios.{built_version}",
    releaseScope: "global",
    createdAt: "2024-12-01T12:00:00.000Z" as ISO8601,
  },
  androidApp: {
    id: "018f1a50-0000-7000-8000-000000000102" as UuidV7,
    name: "Android App",
    color: "emerald",
    namingPattern: "app.android.{built_version}",
    releaseScope: "global",
    createdAt: "2024-12-01T12:05:00.000Z" as ISO8601,
  },
  globalAdminPhp: {
    id: "018f1a50-0000-7000-8000-000000000103" as UuidV7,
    name: "Global Admin PHP",
    color: "slate",
    namingPattern: "admin.{built_version}",
    releaseScope: "global",
    createdAt: "2024-12-01T12:10:00.000Z" as ISO8601,
  },
  nestJsBackend: {
    id: "018f1a50-0000-7000-8000-000000000104" as UuidV7,
    name: "NestJS Backend",
    color: "rose",
    namingPattern: "backend.np.{built_version}",
    releaseScope: "global",
    createdAt: "2024-12-01T12:15:00.000Z" as ISO8601,
  },
  desktopAngular: {
    id: "018f1a50-0000-7000-8000-000000000105" as UuidV7,
    name: "Desktop Angular",
    color: "purple",
    namingPattern: "desktop.np.{built_version}",
    releaseScope: "global",
    createdAt: "2024-12-01T12:20:00.000Z" as ISO8601,
  },
  desktopAngularJs: {
    id: "018f1a50-0000-7000-8000-000000000106" as UuidV7,
    name: "Desktop Angular JS",
    color: "amber",
    namingPattern: "desktop.op.{built_version}",
    releaseScope: "version-bound",
    createdAt: "2024-12-01T12:25:00.000Z" as ISO8601,
  },
  phpBackend: {
    id: "018f1a50-0000-7000-8000-000000000107" as UuidV7,
    name: "PHP Backend",
    color: "blue",
    namingPattern: "backend.php.{built_version}",
    releaseScope: "version-bound",
    createdAt: "2024-12-01T12:30:00.000Z" as ISO8601,
  },
} satisfies Record<string, ReleaseComponentFixtureBase>;

export type ReleaseComponentFixtureKey =
  keyof typeof RELEASE_COMPONENT_FIXTURES;

export type ReleaseComponentFixture =
  (typeof RELEASE_COMPONENT_FIXTURES)[ReleaseComponentFixtureKey];

export const releaseComponentFixtures = Object.freeze(
  RELEASE_COMPONENT_FIXTURES,
) as Record<ReleaseComponentFixtureKey, ReleaseComponentFixture>;

export const releaseComponentFixtureList = Object.freeze(
  Object.values(releaseComponentFixtures),
);

export const releaseComponentFixtureIds = Object.freeze(
  Object.fromEntries(
    Object.entries(releaseComponentFixtures).map(([key, value]) => [
      key,
      value.id,
    ]),
  ) as Record<ReleaseComponentFixtureKey, ReleaseComponentFixture["id"]>,
);

export type ReleaseComponentDbRow = {
  id: string;
  name: string;
  color: string;
  namingPattern: string;
  releaseScope: "global" | "version_bound";
  createdAt: Date;
};

export const toReleaseComponentDbRow = (
  fixture: ReleaseComponentFixture,
  overrides: Partial<ReleaseComponentDbRow> = {},
): ReleaseComponentDbRow => ({
  id: fixture.id,
  name: fixture.name,
  color: fixture.color,
  namingPattern: fixture.namingPattern,
  releaseScope:
    fixture.releaseScope === "version-bound" ? "version_bound" : "global",
  createdAt: new Date(fixture.createdAt),
  ...overrides,
});

export const cloneReleaseComponentFixture = (
  fixture: ReleaseComponentFixture,
): ReleaseComponentFixture => ({ ...fixture });
