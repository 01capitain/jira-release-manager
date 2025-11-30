import type { ReleaseVersion } from "@prisma/client";

import {
  ReleaseVersionDefaultsService,
  STATIC_RELEASE_VERSION_NAME,
} from "~/server/services/release-version-defaults.service";
import { DEFAULT_RELEASE_TRACK } from "~/shared/types/release-track";

const makeReleaseVersion = (name: string): ReleaseVersion =>
  ({
    id: "018f1a50-0000-7000-9000-000000000999",
    name,
    releaseTrack: DEFAULT_RELEASE_TRACK,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    createdById: "018f1a50-0000-7000-9000-000000000998",
    lastUsedIncrement: 0,
  }) as ReleaseVersion;

describe("ReleaseVersionDefaultsService", () => {
  const service = new ReleaseVersionDefaultsService();

  it("increments numeric names", () => {
    const defaults = service.calculateValues(makeReleaseVersion("179"));
    expect(defaults.name).toBe("180");
    expect(defaults.releaseTrack).toBe(DEFAULT_RELEASE_TRACK);
  });

  it("increments minor version when major/minor pattern is used", () => {
    const defaults = service.calculateValues(makeReleaseVersion("179.1"));
    expect(defaults.name).toBe("179.2");
  });

  it("preserves prefix while incrementing dotted versions", () => {
    const defaults = service.calculateValues(makeReleaseVersion("v180.34"));
    expect(defaults.name).toBe("v180.35");
  });

  it("falls back to static name when no existing release", () => {
    const defaults = service.calculateValues(null);
    expect(defaults.name).toBe(STATIC_RELEASE_VERSION_NAME);
  });

  it("falls back to static name when existing name is empty", () => {
    const defaults = service.calculateValues(makeReleaseVersion(""));
    expect(defaults.name).toBe(STATIC_RELEASE_VERSION_NAME);
  });

  it("falls back to static name for unsupported patterns", () => {
    const defaults = service.calculateValues(makeReleaseVersion("release-fox"));
    expect(defaults.name).toBe(STATIC_RELEASE_VERSION_NAME);
  });
});
