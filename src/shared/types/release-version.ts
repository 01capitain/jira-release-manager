import type { ISO8601 } from "~/shared/types/iso8601";
import type { ReleaseTrack } from "~/shared/types/release-track";
import type { UuidV7 } from "~/shared/types/uuid";

export type ReleaseVersionDto = {
  id: UuidV7;
  name: string;
  releaseTrack: ReleaseTrack;
  createdAt: ISO8601;
};
