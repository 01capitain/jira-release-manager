import type { ISO8601 } from "~/shared/types/iso8601";
import type { PatchStatus } from "~/shared/types/patch-status";
import type { UuidV7 } from "~/shared/types/uuid";

export type PatchTransitionActionDto =
  | "start_deployment"
  | "cancel_deployment"
  | "mark_active"
  | "revert_to_deployment"
  | "deprecate"
  | "reactivate";

export type PatchTransitionDto = {
  id: UuidV7;
  patchId: UuidV7;
  fromStatus: PatchStatus;
  toStatus: PatchStatus;
  action: PatchTransitionActionDto;
  createdAt: ISO8601;
  createdById: UuidV7;
};
