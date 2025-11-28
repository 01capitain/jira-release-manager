import type { PatchStatus } from "~/shared/types/patch-status";
import type { PatchTransitionActionDto } from "~/shared/types/patch-transition";
import type { ISO8601 } from "~/shared/types/iso8601";
import type { UuidV7 } from "~/shared/types/uuid";

export type PatchStatusHistoryEntry = {
  id: UuidV7;
  fromStatus: PatchStatus;
  toStatus: PatchStatus;
  action: PatchTransitionActionDto;
  createdAt: ISO8601;
  createdById: UuidV7;
};

export type PatchStatusResponse = {
  status: PatchStatus;
  history: PatchStatusHistoryEntry[];
};
