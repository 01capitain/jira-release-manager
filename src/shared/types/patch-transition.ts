import type { ISO8601 } from "~/shared/types/iso8601";
import type { PatchAction, PatchStatus } from "~/shared/types/patch-status";
import type { UuidV7 } from "~/shared/types/uuid";

export type PatchTransitionActionDto = PatchAction;

export type PatchTransitionDto = {
  id: UuidV7;
  patchId: UuidV7;
  fromStatus: PatchStatus;
  toStatus: PatchStatus;
  action: PatchTransitionActionDto;
  createdAt: ISO8601;
  createdById: UuidV7;
};
