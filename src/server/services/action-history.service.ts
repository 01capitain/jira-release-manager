import type { Prisma, PrismaClient } from "@prisma/client";

import { mapToActionHistoryEntryDtos } from "~/server/zod/dto/action-history.dto";
import type { ActionHistoryEntryDto } from "~/shared/types/action-history";

export type ActionStatus = "success" | "failed" | "cancelled";

export type ActionStartInput = {
  actionType: string;
  message: string;
  userId: string;
  sessionToken?: string | null;
  workflowId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type SubactionInput = {
  subactionType: string;
  message: string;
  status?: ActionStatus;
  metadata?: Record<string, unknown> | null;
};

export interface ActionLogger {
  readonly id: string | null;
  subaction(input: SubactionInput, client?: Prisma.TransactionClient): Promise<void>;
  complete(
    status: ActionStatus,
    options?: { message?: string; metadata?: Record<string, unknown> | null },
  ): Promise<void>;
}

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

const jsonValue = (
  value: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return value as Prisma.InputJsonValue;
};

type Delegates = {
  actionLog: PrismaClient["actionLog"];
  actionSubactionLog: PrismaClient["actionSubactionLog"];
};

const getDelegates = (client: PrismaClientOrTx): Delegates | null => {
  const anyClient = client as PrismaClient & {
    actionLog?: PrismaClient["actionLog"];
    actionSubactionLog?: PrismaClient["actionSubactionLog"];
  };
  if (
    typeof anyClient.actionLog?.create !== "function" ||
    typeof anyClient.actionSubactionLog?.create !== "function"
  ) {
    return null;
  }
  return {
    actionLog: anyClient.actionLog,
    actionSubactionLog: anyClient.actionSubactionLog,
  };
};

class PrismaActionLogger implements ActionLogger {
  constructor(
    private readonly db: PrismaClient,
    private readonly actionId: string,
  ) {}

  get id(): string {
    return this.actionId;
  }

  async subaction(
    input: SubactionInput,
    client?: Prisma.TransactionClient,
  ): Promise<void> {
    const delegates = getDelegates(client ?? this.db);
    if (!delegates) {
      console.debug("Action history delegates unavailable, skipping subaction");
      return;
    }
    await delegates.actionSubactionLog.create({
      data: {
        actionId: this.actionId,
        subactionType: input.subactionType,
        message: input.message.trim(),
        status: input.status ?? "success",
        metadata: jsonValue(input.metadata),
      },
    });
  }

  async complete(
    status: ActionStatus,
    options?: {
      message?: string;
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<void> {
    const delegates = getDelegates(this.db);
    if (!delegates) {
      console.debug("Action history delegates unavailable, skipping complete");
      return;
    }
    const data: Record<string, unknown> = {
      status,
    };
    if (options?.message) {
      data.message = options.message.trim();
    }
    if (options && "metadata" in options) {
      data.metadata = jsonValue(options.metadata);
    }
    await delegates.actionLog.update({
      where: { id: this.actionId },
      data,
    });
  }
}

class NoopActionLogger implements ActionLogger {
  readonly id: string | null = null;
  async subaction() {
    // noop
  }
  async complete() {
    // noop
  }
}

export class ActionHistoryService {
  constructor(private readonly db: PrismaClient) {}

  async startAction(input: ActionStartInput): Promise<ActionLogger> {
    const delegates = getDelegates(this.db);
    if (!delegates) {
      return new NoopActionLogger();
    }
    const row = await delegates.actionLog.create({
      data: {
        actionType: input.actionType,
        message: input.message.trim(),
        status: "success",
        sessionToken: input.sessionToken ?? null,
        workflowId: input.workflowId ?? null,
        metadata: jsonValue(input.metadata),
        createdById: input.userId,
      },
      select: { id: true },
    });
    return new PrismaActionLogger(this.db, row.id);
  }

  async finalizeAction(
    actionId: string,
    status: ActionStatus,
    options?: {
      message?: string;
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<void> {
    const delegates = getDelegates(this.db);
    if (!delegates) return;
    await delegates.actionLog.update({
      where: { id: actionId },
      data: {
        status,
        ...(options?.message ? { message: options.message.trim() } : {}),
        ...(options && "metadata" in options
          ? { metadata: jsonValue(options.metadata) }
          : {}),
      },
    });
  }

  async recordSubaction(
    actionId: string,
    input: SubactionInput,
    client?: Prisma.TransactionClient,
  ): Promise<void> {
    const logger = new PrismaActionLogger(this.db, actionId);
    await logger.subaction(input, client);
  }

  async listBySession(
    sessionToken: string | null | undefined,
    userId: string | null | undefined,
    limit = 50,
  ): Promise<ActionHistoryEntryDto[]> {
    const delegates = getDelegates(this.db);
    if (!delegates) {
      return [];
    }
    if (!sessionToken && !userId) {
      return [];
    }

    const rows = await delegates.actionLog.findMany({
      where: sessionToken
        ? { sessionToken }
        : { createdById: userId },
      orderBy: { createdAt: "asc" },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        subactions: {
          orderBy: { createdAt: "asc" },
        },
      },
      take: limit,
    });
    return mapToActionHistoryEntryDtos(rows);
  }
}
