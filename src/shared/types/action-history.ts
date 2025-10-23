import type { ISO8601 } from "~/shared/types/iso8601";
import type { UserSummaryDto } from "~/shared/types/user";

export type ActionExecutionStatus = "success" | "failed" | "cancelled";

export type ActionHistorySubentryDto = {
  id: string;
  subactionType: string;
  message: string;
  status: ActionExecutionStatus;
  createdAt: ISO8601;
  metadata?: Record<string, unknown> | null;
};

export type ActionHistoryEntryDto = {
  id: string;
  actionType: string;
  message: string;
  status: ActionExecutionStatus;
  createdAt: ISO8601;
  createdBy: UserSummaryDto;
  subactions: ActionHistorySubentryDto[];
  metadata?: Record<string, unknown> | null;
};
