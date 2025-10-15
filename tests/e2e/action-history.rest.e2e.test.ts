import type { Session } from "next-auth";
import { NextRequest } from "next/server";

jest.mock("superjson", () => ({
  __esModule: true,
  default: {
    serialize: jest.fn((value: unknown) => ({ json: value })),
    deserialize: jest.fn((payload: unknown) => payload),
  },
}));

type ActionRecord = {
  id: string;
  actionType: string;
  message: string;
  status: "success" | "failed" | "cancelled";
  createdAt: Date;
  metadata?: Record<string, unknown> | null;
  createdBy: {
    id: string;
    name: string | null;
    email: string | null;
  };
  sessionToken: string | null;
  subactions: Array<{
    id: string;
    subactionType: string;
    message: string;
    status: "success" | "failed" | "cancelled";
    createdAt: Date;
    metadata?: Record<string, unknown> | null;
  }>;
};

const actionData: ActionRecord[] = [];

const makeUuid = (offset: number) =>
  `018f1a50-0000-7000-8000-${offset.toString(16).padStart(12, "0")}`;

const USER_ID = makeUuid(50_000);

const cloneAction = (record: ActionRecord): ActionRecord => ({
  ...record,
  createdAt: new Date(record.createdAt),
  metadata: record.metadata
    ? { ...record.metadata }
    : (record.metadata ?? null),
  createdBy: { ...record.createdBy },
  subactions: record.subactions.map((sub) => ({
    ...sub,
    createdAt: new Date(sub.createdAt),
    metadata: sub.metadata ? { ...sub.metadata } : (sub.metadata ?? null),
  })),
});

const setActionRecords = (records: ActionRecord[]) => {
  actionData.splice(0, actionData.length, ...records.map(cloneAction));
};

const clearActionRecords = () => {
  actionData.splice(0, actionData.length);
};

const filterActions = (
  records: ActionRecord[],
  where?: Record<string, unknown>,
): ActionRecord[] => {
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
      record.createdBy.id !== where.createdById
    ) {
      return false;
    }
    return true;
  });
};

const mockDb: Record<string, unknown> = {};

mockDb.actionLog = {
  create: jest.fn(),
  update: jest.fn(),
  count: jest.fn(
    async ({ where }: { where?: Record<string, unknown> } = {}) => {
      return filterActions(actionData, where).length;
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
      include?: Record<string, unknown>;
    } = {}) => {
      const filtered = filterActions(actionData, where);
      const orders = Array.isArray(orderBy)
        ? orderBy
        : orderBy
          ? [orderBy]
          : [];
      const createdOrder =
        orders.find((entry) => entry.createdAt)?.createdAt ?? "desc";
      const idOrder =
        orders.find((entry) => entry.id)?.id ?? createdOrder ?? "desc";
      const sorted = [...filtered].sort((a, b) => {
        const timeDiff = a.createdAt.getTime() - b.createdAt.getTime();
        if (timeDiff !== 0) {
          return createdOrder === "asc" ? timeDiff : -timeDiff;
        }
        const idCompare = a.id.localeCompare(b.id);
        return idOrder === "asc" ? idCompare : -idCompare;
      });
      const limit =
        typeof take === "number" ? Math.max(0, take) : sorted.length;
      return sorted.slice(skip, skip + limit).map(cloneAction);
    },
  ),
};

mockDb.actionSubactionLog = {
  create: jest.fn(),
};

jest.mock(
  "~/server/auth",
  () => ({
    signIn: jest.fn(),
    signOut: jest.fn(),
    auth: jest.fn(),
  }),
  { virtual: true },
);

jest.mock("~/server/db", () => ({
  db: mockDb,
}));

import { GET as listActionHistory } from "~/app/api/v1/action-history/route";
import { auth } from "~/server/auth";

const authMock = auth as unknown as jest.MockedFunction<
  () => Promise<Session | null>
>;

type JsonResponse = {
  json: () => Promise<unknown>;
};

const parseJsonObject = async (
  response: JsonResponse,
): Promise<Record<string, unknown>> => {
  const json: unknown = await response.json();
  if (!json || typeof json !== "object") {
    throw new Error("Expected JSON object payload");
  }
  return json as Record<string, unknown>;
};

const executeHandler = async (request: NextRequest): Promise<Response> => {
  return listActionHistory(request, { params: Promise.resolve({}) });
};

const authenticatedSession: Session = {
  user: {
    id: USER_ID,
    name: "Action Tester",
  },
  expires: "2099-01-01T00:00:00.000Z",
};

describe("GET /api/v1/action-history", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearActionRecords();
    authMock.mockReset();
    globalThis.__createRestContextMock = async (req: NextRequest) => {
      const cookieHeader = req.headers.get("cookie") ?? "";
      const sessionToken =
        cookieHeader
          .split(";")
          .map((entry: string) => entry.trim())
          .find((entry: string) => entry.startsWith("next-auth.session-token="))
          ?.split("=")[1] ?? null;
      return {
        db: mockDb,
        session: await authMock(),
        sessionToken,
        headers: req.headers,
      };
    };
  });

  afterEach(() => {
    globalThis.__createRestContextMock = undefined;
  });

  it("returns paginated action history for an authenticated session", async () => {
    authMock.mockResolvedValue(authenticatedSession);
    const sessionToken = "test-session-token";
    setActionRecords([
      {
        id: makeUuid(1),
        actionType: "action.createRelease",
        message: "Created release 1.0.0",
        status: "success",
        createdAt: new Date("2024-07-01T12:00:00.000Z"),
        metadata: { releaseId: "rel-1" },
        createdBy: authenticatedSession.user
          ? {
              id: authenticatedSession.user.id,
              name: authenticatedSession.user.name ?? null,
              email: "tester@example.com",
            }
          : {
              id: makeUuid(80_000),
              name: null,
              email: null,
            },
        sessionToken,
        subactions: [
          {
            id: makeUuid(1_000),
            subactionType: "release.persist",
            message: "Release persisted",
            status: "success",
            createdAt: new Date("2024-07-01T12:00:10.000Z"),
            metadata: { id: "rel-1" },
          },
        ],
      },
      {
        id: makeUuid(2),
        actionType: "action.createRelease",
        message: "Created release 1.1.0",
        status: "failed",
        createdAt: new Date("2024-07-01T12:01:00.000Z"),
        metadata: { releaseId: "rel-2" },
        createdBy: {
          id: authenticatedSession.user.id,
          name: authenticatedSession.user.name ?? null,
          email: "tester@example.com",
        },
        sessionToken,
        subactions: [
          {
            id: makeUuid(1_001),
            subactionType: "release.validate",
            message: "Validation failed",
            status: "failed",
            createdAt: new Date("2024-07-01T12:01:05.000Z"),
            metadata: { reason: "Duplicate name" },
          },
        ],
      },
      {
        id: makeUuid(3),
        actionType: "action.createRelease",
        message: "Created release 1.2.0",
        status: "success",
        createdAt: new Date("2024-07-01T12:02:00.000Z"),
        metadata: null,
        createdBy: {
          id: authenticatedSession.user.id,
          name: authenticatedSession.user.name ?? null,
          email: "tester@example.com",
        },
        sessionToken,
        subactions: [
          {
            id: makeUuid(1_002),
            subactionType: "release.persist",
            message: "Release persisted",
            status: "success",
            createdAt: new Date("2024-07-01T12:02:05.000Z"),
          },
        ],
      },
    ]);

    const request = new NextRequest(
      "http://test/api/v1/action-history?page=1&pageSize=2&sortBy=-createdAt",
      {
        method: "GET",
        headers: {
          cookie: `next-auth.session-token=${sessionToken}`,
        },
      },
    );

    const response = await executeHandler(request);
    const payload = await parseJsonObject(response);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      data: [
        {
          id: actionData[2]?.id,
          message: actionData[2]?.message,
          status: actionData[2]?.status,
          createdAt: actionData[2]?.createdAt.toISOString(),
          createdBy: {
            id: authenticatedSession.user?.id,
            name: authenticatedSession.user?.name ?? null,
            email: "tester@example.com",
          },
        },
        {
          id: actionData[1]?.id,
          message: actionData[1]?.message,
          status: actionData[1]?.status,
          createdAt: actionData[1]?.createdAt.toISOString(),
        },
      ],
      pagination: {
        page: 1,
        pageSize: 2,
        totalItems: 3,
        hasNextPage: true,
      },
    });
    expect(
      (mockDb.actionLog as Record<string, unknown>).findMany,
    ).toHaveBeenCalledWith({
      where: { sessionToken },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        subactions: { orderBy: { createdAt: "asc" } },
      },
      skip: 0,
      take: 2,
    });
  });

  it("returns 400 when pagination parameters are invalid", async () => {
    authMock.mockResolvedValue(authenticatedSession);
    const request = new NextRequest(
      "http://test/api/v1/action-history?page=0&pageSize=0",
      {
        method: "GET",
        headers: {
          cookie: "next-auth.session-token=test-session-token",
        },
      },
    );

    const response = await executeHandler(request);
    const payload = await parseJsonObject(response);

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Invalid request payload",
    });
    expect(
      (mockDb.actionLog as Record<string, unknown>).findMany,
    ).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const request = new NextRequest("http://test/api/v1/action-history", {
      method: "GET",
    });

    const response = await executeHandler(request);
    const payload = await parseJsonObject(response);

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
    expect(
      (mockDb.actionLog as Record<string, unknown>).count,
    ).not.toHaveBeenCalled();
    expect(
      (mockDb.actionLog as Record<string, unknown>).findMany,
    ).not.toHaveBeenCalled();
  });
});
declare global {
  var __createRestContextMock:
    | ((req: NextRequest) => Promise<{
        db: Record<string, unknown>;
        session: Session | null;
        sessionToken: string | null;
        headers: Headers;
      }>)
    | undefined;
}

jest.mock("~/server/rest/context", () => ({
  createRestContext: jest.fn(async (req: NextRequest) => {
    if (typeof globalThis.__createRestContextMock !== "function") {
      throw new Error("createRestContext mock not initialized");
    }
    return globalThis.__createRestContextMock(req);
  }),
}));
