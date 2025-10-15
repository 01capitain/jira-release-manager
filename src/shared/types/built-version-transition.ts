import type { ISO8601 } from "~/shared/types/iso8601";
import type { BuiltVersionStatus } from "~/shared/types/built-version-status";

export type BuiltVersionTransitionActionDto =
  | "start_deployment"
  | "cancel_deployment"
  | "mark_active"
  | "revert_to_deployment"
  | "deprecate"
  | "reactivate";

export type BuiltVersionTransitionDto = {
  id: string;
  builtVersionId: string;
  fromStatus: BuiltVersionStatus;
  toStatus: BuiltVersionStatus;
  action: BuiltVersionTransitionActionDto;
  createdAt: ISO8601;
  createdById: string;
};
