import type { ISO8601 } from "~/shared/types/iso8601";
import type { BuiltVersionStatus } from "~/shared/types/built-version-status";
import type { UuidV7 } from "~/shared/types/uuid";

export type BuiltVersionTransitionActionDto =
  | "start_deployment"
  | "cancel_deployment"
  | "mark_active"
  | "revert_to_deployment"
  | "deprecate"
  | "reactivate";

export type BuiltVersionTransitionDto = {
  id: UuidV7;
  builtVersionId: UuidV7;
  fromStatus: BuiltVersionStatus;
  toStatus: BuiltVersionStatus;
  action: BuiltVersionTransitionActionDto;
  createdAt: ISO8601;
  createdById: UuidV7;
};
