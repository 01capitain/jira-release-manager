import { mapReleaseCollections } from "~/app/versions/releases/api";
import type {
  ReleasePatchDto,
  ReleaseVersionWithPatchesDto,
} from "~/shared/types/release-version-with-patches";
import type { UuidV7 } from "~/shared/types/uuid";
import type { ISO8601 } from "~/shared/types/iso8601";

const uuid = (value: string) => value as UuidV7;
const iso = (value: string) => value as ISO8601;

const createRelease = (
  overrides: Partial<ReleaseVersionWithPatchesDto> = {},
): ReleaseVersionWithPatchesDto => ({
  id: uuid("00000000-0000-0000-0000-000000000001"),
  name: "1.0.0",
  releaseTrack: "Future",
  createdAt: iso("2024-01-01T00:00:00.000Z"),
  patches: [],
  ...overrides,
});

const createPatch = (
  overrides: Partial<ReleasePatchDto> = {},
): ReleasePatchDto => ({
  id: uuid("00000000-0000-0000-0000-000000000101"),
  name: "1.0.0.0",
  versionId: uuid("00000000-0000-0000-0000-000000000001"),
  createdAt: iso("2024-01-02T00:00:00.000Z"),
  currentStatus: "in_development",
  deployedComponents: [],
  hasComponentData: true,
  ...overrides,
});

describe("mapReleaseCollections", () => {
  it("normalizes release and patch lookups", () => {
    const releaseA = createRelease({
      id: uuid("00000000-0000-0000-0000-000000000010"),
      name: "2.0.0",
      patches: [
        createPatch({
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
      patches: [
        createPatch({
          id: uuid("00000000-0000-0000-0000-000000000210"),
          name: "3.0.0.0",
          versionId: uuid("00000000-0000-0000-0000-000000000011"),
        }),
      ],
    });

    const result = mapReleaseCollections([releaseA, releaseB]);

    expect(result.releaseIds).toEqual([releaseA.id, releaseB.id]);
    expect(result.releasesById[releaseA.id]).toEqual(releaseA);
    expect(result.patchIdsByReleaseId[releaseB.id]).toEqual([
      releaseB.patches[0]!.id,
    ]);
    expect(result.patchById[releaseB.patches[0]!.id]).toMatchObject({
      releaseId: releaseB.id,
      name: "3.0.0.0",
    });
  });

  it("marks patches that still require component backfill", () => {
    const patchWithoutComponents = createPatch({
      id: uuid("00000000-0000-0000-0000-000000000310"),
      hasComponentData: false,
      deployedComponents: [],
    });
    const result = mapReleaseCollections([
      createRelease({ patches: [patchWithoutComponents] }),
    ]);

    expect(result.missingComponentPatchIds).toEqual([
      patchWithoutComponents.id,
    ]);
  });

  it("uses currentStatus for status snapshots", () => {
    const patch = createPatch({
      id: uuid("00000000-0000-0000-0000-000000000710"),
      currentStatus: "active",
    });
    const result = mapReleaseCollections([createRelease({ patches: [patch] })]);

    expect(result.patchStatusById[patch.id]).toEqual({
      status: "active",
      history: [],
    });
  });
});
