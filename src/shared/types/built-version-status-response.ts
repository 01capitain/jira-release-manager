import type { BuiltVersionStatus } from "~/shared/types/built-version-status";
import type { ISO8601 } from "~/shared/types/iso8601";
import type { UuidV7 } from "~/shared/types/uuid";

export type BuiltVersionStatusHistoryEntry = {
  id: UuidV7;
  fromStatus: BuiltVersionStatus;
  toStatus: BuiltVersionStatus;
  action: string;
  createdAt: ISO8601;
  createdById: UuidV7;
};

export type BuiltVersionStatusResponse = {
  status: BuiltVersionStatus;
  history: BuiltVersionStatusHistoryEntry[];
};
