import { mapReleaseCollections } from "~/app/versions/releases/api";
import type {
  ReleaseBuiltVersionDto,
  ReleaseVersionWithBuildsDto,
} from "~/shared/types/release-version-with-builds";
import type { UuidV7 } from "~/shared/types/uuid";
import type { ISO8601 } from "~/shared/types/iso8601";
import type { BuiltVersionTransitionDto } from "~/shared/types/built-version-transition";

const uuid = (value: string) => value as UuidV7;
const iso = (value: string) => value as ISO8601;

const createRelease = (
  overrides: Partial<ReleaseVersionWithBuildsDto> = {},
): ReleaseVersionWithBuildsDto => ({
  id: uuid("00000000-0000-0000-0000-000000000001"),
  name: "1.0.0",
  releaseTrack: "Future",
  createdAt: iso("2024-01-01T00:00:00.000Z"),
  builtVersions: [],
  ...overrides,
});

const createBuilt = (
  overrides: Partial<ReleaseBuiltVersionDto> = {},
): ReleaseBuiltVersionDto => ({
  id: uuid("00000000-0000-0000-0000-000000000101"),
  name: "1.0.0.0",
  versionId: uuid("00000000-0000-0000-0000-000000000001"),
  createdAt: iso("2024-01-02T00:00:00.000Z"),
  deployedComponents: [],
  transitions: [],
  hasComponentData: true,
  hasStatusData: true,
  ...overrides,
});

describe("mapReleaseCollections", () => {
  it("normalizes release and built lookups", () => {
    const releaseA = createRelease({
      id: uuid("00000000-0000-0000-0000-000000000010"),
      name: "2.0.0",
      builtVersions: [
        createBuilt({
          id: uuid("00000000-0000-0000-0000-000000000110"),
          name: "2.0.0.0",
          versionId: uuid("00000000-0000-0000-0000-000000000010"),
        }),
      ],
    });
    const releaseB = createRelease({
      id: uuid("00000000-0000-0000-0000-000000000011"),
      name: "3.0.0",
      createdAt: iso("2024-01-05T00:00:00.000Z"),
      builtVersions: [
        createBuilt({
          id: uuid("00000000-0000-0000-0000-000000000210"),
          name: "3.0.0.0",
          versionId: uuid("00000000-0000-0000-0000-000000000011"),
        }),
      ],
    });

    const result = mapReleaseCollections([releaseA, releaseB]);

    expect(result.releaseIds).toEqual([releaseA.id, releaseB.id]);
    expect(result.releasesById[releaseA.id]).toEqual(releaseA);
    expect(result.builtIdsByReleaseId[releaseB.id]).toEqual([
      releaseB.builtVersions[0]!.id,
    ]);
    expect(result.builtById[releaseB.builtVersions[0]!.id]).toMatchObject({
      releaseId: releaseB.id,
      name: "3.0.0.0",
    });
  });

  it("marks built versions that still require component backfill", () => {
    const builtWithoutComponents = createBuilt({
      id: uuid("00000000-0000-0000-0000-000000000310"),
      hasComponentData: false,
      deployedComponents: [],
    });
    const result = mapReleaseCollections([
      createRelease({ builtVersions: [builtWithoutComponents] }),
    ]);

    expect(result.missingComponentBuiltIds).toEqual([
      builtWithoutComponents.id,
    ]);
  });

  it("derives status snapshots from transitions", () => {
    const latestTransition: BuiltVersionTransitionDto = {
      id: uuid("00000000-0000-0000-0000-000000000511"),
      builtVersionId: uuid("00000000-0000-0000-0000-000000000410"),
      fromStatus: "in_deployment",
      toStatus: "active",
      action: "mark_active",
      createdAt: iso("2024-01-04T00:00:00.000Z"),
      createdById: uuid("00000000-0000-0000-0000-000000000611"),
    };
    const earlierTransition: BuiltVersionTransitionDto = {
      id: uuid("00000000-0000-0000-0000-000000000510"),
      builtVersionId: uuid("00000000-0000-0000-0000-000000000410"),
      fromStatus: "in_development",
      toStatus: "in_deployment",
      action: "start_deployment",
      createdAt: iso("2024-01-03T00:00:00.000Z"),
      createdById: uuid("00000000-0000-0000-0000-000000000610"),
    };
    const built = createBuilt({
      id: uuid("00000000-0000-0000-0000-000000000410"),
      transitions: [latestTransition, earlierTransition],
    });

    const result = mapReleaseCollections([
      createRelease({ builtVersions: [built] }),
    ]);

    const snapshot = result.builtStatusById[built.id];
    expect(snapshot?.status).toEqual("active");
    expect(snapshot?.history).toEqual([
      expect.objectContaining({
        id: earlierTransition.id,
        fromStatus: earlierTransition.fromStatus,
        toStatus: earlierTransition.toStatus,
        action: earlierTransition.action,
      }),
      expect.objectContaining({
        id: latestTransition.id,
        fromStatus: latestTransition.fromStatus,
        toStatus: latestTransition.toStatus,
        action: latestTransition.action,
      }),
    ]);
  });

  it("defaults status snapshots to in_development when no transitions exist", () => {
    const built = createBuilt({
      id: uuid("00000000-0000-0000-0000-000000000710"),
      transitions: [],
    });
    const result = mapReleaseCollections([
      createRelease({ builtVersions: [built] }),
    ]);

    expect(result.builtStatusById[built.id]).toEqual({
      status: "in_development",
      history: [],
    });
  });
});
