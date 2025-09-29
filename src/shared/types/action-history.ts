import type { ISO8601 } from "~/shared/types/iso8601";

export type ActionHistoryStatus = "success" | "failed" | "cancelled";

export type ActionHistoryUserDto = {
  id: string;
  name?: string | null;
  email?: string | null;
};

export type ActionHistorySubentryDto = {
  id: string;
  subactionType: string;
  message: string;
  status: ActionHistoryStatus;
  createdAt: ISO8601;
  metadata?: Record<string, unknown> | null;
};

export type ActionHistoryEntryDto = {
  id: string;
  actionType: string;
  message: string;
  status: ActionHistoryStatus;
  createdAt: ISO8601;
  createdBy: ActionHistoryUserDto;
  subactions: ActionHistorySubentryDto[];
  metadata?: Record<string, unknown> | null;
};
