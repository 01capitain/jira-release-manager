import type { PrismaClient } from "@prisma/client";

import {
  ActionHistoryListInputSchema,
  DEFAULT_ACTION_HISTORY_LIST_INPUT,
} from "~/server/api/schemas";
import { ActionHistoryService } from "~/server/services/action-history.service";
import type { ActionHistoryEntryDto } from "~/shared/types/action-history";
import { registerPaginationBehaviorTests } from "../shared/pagination.behavior";

type ActionStatus = ActionHistoryEntryDto["status"];

type MockSubaction = {
  id: string;
  subactionType: string;
  message: string;
  status: ActionStatus;
  createdAt: Date;
  metadata?: Record<string, unknown> | null;
};

type MockAction = {
  id: string;
  actionType: string;
  message: string;
  status: ActionStatus;
  createdAt: Date;
  metadata?: Record<string, unknown> | null;
  createdById: string;
  createdByName: string | null;
  createdByEmail: string | null;
  sessionToken: string | null;
  subactions: MockSubaction[];
};

const makeUuid = (offset: number) =>
  `018f1a50-0000-7000-8000-${offset.toString(16).padStart(12, "0")}`;

const statuses: ActionStatus[] = ["success", "failed", "cancelled"];

const createSubactions = (actionIndex: number): MockSubaction[] => {
  return Array.from({ length: 2 }, (_, subIndex) => {
    const created = new Date(
      Date.UTC(2024, 6, 1, 12, actionIndex, subIndex * 3),
    );
    return {
      id: makeUuid(1_000 + actionIndex * 10 + subIndex + 1),
      subactionType: `subaction.${subIndex + 1}`,
      message: `Subaction ${subIndex + 1} for ${actionIndex + 1}`,
      status: statuses[(actionIndex + subIndex) % statuses.length]!,
      createdAt: created,
      metadata: subIndex % 2 === 0 ? { step: subIndex + 1 } : null,
    };
  });
};

const createActions = (count: number, sessionToken: string): MockAction[] => {
  return Array.from({ length: count }, (_, index) => {
    const created = new Date(Date.UTC(2024, 6, 1, 12, index, 0));
    return {
      id: makeUuid(index + 1),
      actionType: `action.${(index % 3) + 1}`,
      message: `Action message ${index + 1}`,
      status: statuses[index % statuses.length]!,
      createdAt: created,
      metadata: index % 2 === 0 ? { step: index } : null,
      createdById: makeUuid(5_000 + index),
      createdByName: "Action Tester",
      createdByEmail: "tester@example.com",
      sessionToken,
      subactions: createSubactions(index),
    };
  });
};

const filterActions = (
  records: MockAction[],
  where?: Record<string, unknown>,
): MockAction[] => {
  if (!where) return [...records];
  return records.filter((record) => {
    if (
      typeof where.sessionToken === "string" &&
      record.sessionToken !== where.sessionToken
    ) {
      return false;
    }
    if (
      typeof where.createdById === "string" &&
      record.createdById !== where.createdById
    ) {
      return false;
    }
    return true;
  });
};

const createMockDb = (records: MockAction[]) => {
  const clone = (action: MockAction) => ({
    id: action.id,
    actionType: action.actionType,
    message: action.message,
    status: action.status,
    createdAt: new Date(action.createdAt),
    metadata: action.metadata ?? null,
    createdBy: {
      id: action.createdById,
      name: action.createdByName,
      email: action.createdByEmail,
    },
    subactions: action.subactions
      .map((sub) => ({
        ...sub,
        createdAt: new Date(sub.createdAt),
      }))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
  });

  const compareWithDirection = (
    direction: "asc" | "desc",
    aValue: number,
    bValue: number,
  ) => {
    return direction === "asc" ? aValue - bValue : bValue - aValue;
  };

  return {
    actionLog: {
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(
        async ({ where }: { where?: Record<string, unknown> } = {}) => {
          return filterActions(records, where).length;
        },
      ),
      findMany: jest.fn(
        async ({
          where,
          orderBy,
          skip = 0,
          take,
        }: {
          where?: Record<string, unknown>;
          orderBy?:
            | { createdAt?: "asc" | "desc"; id?: "asc" | "desc" }
            | Array<{ createdAt?: "asc" | "desc"; id?: "asc" | "desc" }>;
          skip?: number;
          take?: number;
        } = {}) => {
          const filtered = filterActions(records, where);
          const orderList = Array.isArray(orderBy)
            ? orderBy
            : orderBy
              ? [orderBy]
              : [];
          const primaryDirection =
            orderList.find((entry) => entry.createdAt)?.createdAt ?? "desc";
          const secondaryDirection =
            orderList.find((entry) => entry.id)?.id ?? primaryDirection;
          const sorted = [...filtered].sort((a, b) => {
            const timeCompare = compareWithDirection(
              primaryDirection ?? "desc",
              a.createdAt.getTime(),
              b.createdAt.getTime(),
            );
            if (timeCompare !== 0) {
              return timeCompare;
            }
            const idCompare = a.id.localeCompare(b.id);
            return secondaryDirection === "asc" ? idCompare : -idCompare;
          });
          const limit =
            typeof take === "number" ? Math.max(0, take) : sorted.length;
          return sorted.slice(skip, skip + limit).map(clone);
        },
      ),
    },
    actionSubactionLog: {
      create: jest.fn(),
    },
  };
};

describe("ActionHistoryService.listBySession pagination", () => {
  const sessionToken = "session-123";
  const records = createActions(12, sessionToken);
  const db = createMockDb(records);
  const service = new ActionHistoryService(db as unknown as PrismaClient);

  registerPaginationBehaviorTests<ActionHistoryEntryDto, "createdAt">({
    suiteName: "Action history list",
    scenario: { totalItems: records.length, pageSize: 5 },
    maxPageSize: 50,
    sortFields: ["createdAt"],
    makeRequest: (params) =>
      service.listBySession(sessionToken, records[0]?.createdById ?? null, {
        ...DEFAULT_ACTION_HISTORY_LIST_INPUT,
        ...params,
      }),
    normalizeParams: (input) =>
      ActionHistoryListInputSchema.parse({
        page: input.page,
        pageSize: input.pageSize,
        sortBy: input.sortBy,
      }),
    assertSorted: (items, sortBy) => {
      const descending = sortBy.startsWith("-");
      for (let index = 1; index < items.length; index++) {
        const prev = items[index - 1]!;
        const curr = items[index]!;
        const prevTs = new Date(prev.createdAt).getTime();
        const currTs = new Date(curr.createdAt).getTime();
        if (descending) {
          expect(prevTs).toBeGreaterThanOrEqual(currTs);
        } else {
          expect(prevTs).toBeLessThanOrEqual(currTs);
        }
      }
    },
  });
});
