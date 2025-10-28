import type { ISO8601 } from "~/shared/types/iso8601";
import type { UserSummaryDto } from "~/shared/types/user";
import type { UuidV7 } from "~/shared/types/uuid";

export type ActionExecutionStatus = "success" | "failed" | "cancelled";

export type ActionHistorySubentryDto = {
  id: UuidV7;
  subactionType: string;
  message: string;
  status: ActionExecutionStatus;
  createdAt: ISO8601;
  metadata?: Record<string, unknown> | null;
};

export type ActionHistoryEntryDto = {
  id: UuidV7;
  actionType: string;
  message: string;
  status: ActionExecutionStatus;
  createdAt: ISO8601;
  createdBy: UserSummaryDto;
  subactions: ActionHistorySubentryDto[];
  metadata?: Record<string, unknown> | null;
};
