import type { ISO8601 } from "~/shared/types/iso8601";
import type { PatchStatus } from "~/shared/types/patch-status";
import type { UuidV7 } from "~/shared/types/uuid";

export type PatchDto = {
  id: UuidV7;
  name: string;
  versionId: UuidV7;
  createdAt: ISO8601;
  currentStatus: PatchStatus;
};
