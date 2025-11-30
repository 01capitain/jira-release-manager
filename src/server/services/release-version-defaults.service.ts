import type { ReleaseVersion } from "@prisma/client";

import { DEFAULT_RELEASE_TRACK } from "~/shared/types/release-track";
import type { ReleaseVersionDefaultsDto } from "~/shared/types/release-version";

export const STATIC_RELEASE_VERSION_NAME = "New Release";

export class ReleaseVersionDefaultsService {
  calculateReleaseTrack(
    _existing: ReleaseVersion | null | undefined,
  ): ReleaseVersionDefaultsDto["releaseTrack"] {
    return DEFAULT_RELEASE_TRACK;
  }

  calculateName(
    existing: ReleaseVersion | null | undefined,
  ): ReleaseVersionDefaultsDto["name"] {
    const name = existing?.name.trim() ?? "";
    const numeric = /^(\d+)$/.exec(name);
    if (numeric) {
      return String(Number.parseInt(numeric[1] ?? "0", 10) + 1);
    }

    const majorMinor = /^(v?)(\d+)\.(\d+)$/i.exec(name);
    if (majorMinor) {
      const [, prefix, major, minor] = majorMinor;
      return `${prefix}${major}.${Number.parseInt(minor ?? "0", 10) + 1}`;
    }

    return STATIC_RELEASE_VERSION_NAME;
  }

  calculateValues(
    existing: ReleaseVersion | null | undefined,
  ): ReleaseVersionDefaultsDto {
    return {
      name: this.calculateName(existing),
      releaseTrack: this.calculateReleaseTrack(existing),
    };
  }
}
