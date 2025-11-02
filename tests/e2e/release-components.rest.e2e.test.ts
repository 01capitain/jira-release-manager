import { Prisma } from "@prisma/client";
import type { Session } from "next-auth";
import { NextRequest } from "next/server";
import {
  releaseComponentFixtureList,
  releaseComponentFixtures,
  toReleaseComponentDbRow,
} from "../fixtures/release-components";
import { userFixtures } from "../fixtures/users";

jest.mock("superjson", () => ({
  __esModule: true,
  default: {
    serialize: jest.fn((value: unknown) => ({ json: value })),
    deserialize: jest.fn((payload: unknown) => payload),
  },
}));

type ReleaseComponentRecord = {
  id: string;
  name: string;
  color: string;
  namingPattern: string;
  releaseScope: "global" | "version_bound";
  createdAt: Date;
};

const componentData: ReleaseComponentRecord[] = [];
let componentCounter = 0;

const cloneComponentRecord = (
  record: ReleaseComponentRecord,
): ReleaseComponentRecord => ({
  ...record,
  createdAt: new Date(record.createdAt),
});

const setComponentRecords = (records: ReleaseComponentRecord[]) => {
  componentData.splice(
    0,
    componentData.length,
    ...records.map(cloneComponentRecord),
  );
  componentCounter = componentData.length;
};

const clearComponentRecords = () => {
  componentData.splice(0, componentData.length);
  componentCounter = 0;
};

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

const authenticatedSession: Session = {
  user: { id: userFixtures.adamScott.id, name: userFixtures.adamScott.name },
  expires: "2099-01-01T00:00:00.000Z",
};

const applySelect = (
  record: ReleaseComponentRecord,
  select: Record<string, unknown> | undefined,
) => {
  if (!select || Object.keys(select).length === 0) {
    return cloneComponentRecord(record);
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(select)) {
    if (value) {
      result[key] =
        (record as Record<string, unknown>)[key] ??
        (cloneComponentRecord(record) as Record<string, unknown>)[key];
    }
  }
  return result;
};

const filterComponents = (
  records: ReleaseComponentRecord[],
  where?: Record<string, unknown>,
): ReleaseComponentRecord[] => {
  if (!where) return [...records];
  let filtered = [...records];
  if (typeof where.releaseScope === "string") {
    filtered = filtered.filter(
      (record) => record.releaseScope === where.releaseScope,
    );
  }
  const nameFilter = where.name as { contains?: string | null } | undefined;
  if (nameFilter?.contains) {
    const needle = nameFilter.contains.toLowerCase();
    filtered = filtered.filter((record) =>
      record.name.toLowerCase().includes(needle),
    );
  }
  return filtered;
};

const mockDb: Record<string, unknown> = {};

mockDb.releaseComponent = {
  count: jest.fn(
    async ({ where }: { where?: Record<string, unknown> } = {}) => {
      return filterComponents(componentData, where).length;
    },
  ),
  findMany: jest.fn(
    async ({
      where,
      skip = 0,
      take,
      orderBy,
      select,
    }: {
      where?: Record<string, unknown>;
      skip?: number;
      take?: number;
      orderBy?: { createdAt?: "asc" | "desc" };
      select?: Record<string, unknown>;
    } = {}) => {
      const filtered = filterComponents(componentData, where);
      const direction = orderBy?.createdAt ?? "desc";
      const sorted = [...filtered].sort((a, b) => {
        if (direction === "asc") {
          return a.createdAt.getTime() - b.createdAt.getTime();
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      const limit = typeof take === "number" ? take : sorted.length;
      return sorted
        .slice(skip, skip + limit)
        .map((record) => applySelect(record, select));
    },
  ),
  findUnique: jest.fn(
    async ({
      where,
      select,
    }: {
      where?: { id?: string };
      select?: Record<string, unknown>;
    } = {}) => {
      const record = componentData.find((entry) => entry.id === where?.id);
      if (!record) return null;
      return applySelect(record, select);
    },
  ),
  create: jest.fn(
    async ({
      data,
      select,
    }: {
      data?: Record<string, unknown>;
      select?: Record<string, unknown>;
    } = {}) => {
      const scopeInput = (data?.releaseScope as string | undefined) ?? "global";
      const normalizedScope: ReleaseComponentRecord["releaseScope"] =
        scopeInput === "version-bound"
          ? "version_bound"
          : scopeInput === "version_bound"
            ? "version_bound"
            : "global";
      const trimmedName =
        (data?.name as string | undefined)?.trim() ?? "Component";
      const duplicate = componentData.find(
        (entry) => entry.name.toLowerCase() === trimmedName.toLowerCase(),
      );
      if (duplicate) {
        throw new Prisma.PrismaClientKnownRequestError(
          "Unique constraint failed on the fields: (`release_component_name_key`)",
          { code: "P2002", clientVersion: "5.12.0" },
        );
      }
      componentCounter += 1;
      const record: ReleaseComponentRecord = {
        id: `018f1a50-0000-7000-8000-${componentCounter
          .toString(16)
          .padStart(12, "0")}`,
        name: trimmedName,
        color: (data?.color as string | undefined) ?? "blue",
        namingPattern:
          (data?.namingPattern as string | undefined)?.trim() ??
          "{release_version}-{built_version}-{increment}",
        releaseScope: normalizedScope,
        createdAt:
          data?.createdAt instanceof Date
            ? data.createdAt
            : new Date(
                `2024-07-${(componentCounter + 10)
                  .toString()
                  .padStart(2, "0")}T12:00:00.000Z`,
              ),
      };
      componentData.unshift(record);
      return applySelect(record, select);
    },
  ),
};

mockDb.$transaction = jest.fn(
  async (fn: (tx: unknown) => Promise<unknown>) => await fn(mockDb),
);

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

import {
  GET as listReleaseComponents,
  POST as createReleaseComponent,
} from "~/app/api/v1/release-components/route";
import { GET as getReleaseComponent } from "~/app/api/v1/release-components/[componentId]/route";
import { auth } from "~/server/auth";

const authMock = auth as unknown as jest.MockedFunction<
  () => Promise<Session | null>
>;

const executeHandler = async (
  handler: (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> },
  ) => Promise<Response>,
  request: NextRequest,
  params: Record<string, string> = {},
) => {
  return handler(request, { params: Promise.resolve(params) });
};

describe("Release Components REST endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearComponentRecords();
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

  describe("GET /api/v1/release-components", () => {
    it("returns a paginated list sorted by newest first", async () => {
      authMock.mockResolvedValue(authenticatedSession);
      const records = releaseComponentFixtureList.map((fixture) =>
        toReleaseComponentDbRow(fixture),
      );
      setComponentRecords(records);
      const expectedOrder = [...releaseComponentFixtureList].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      const request = new NextRequest(
        "http://test/api/v1/release-components?page=1&pageSize=2",
        { method: "GET" },
      );

      const response = await executeHandler(listReleaseComponents, request);
      const payload = await parseJsonObject(response);

      expect(response.status).toBe(200);
      expect(payload).toMatchObject({
        total: records.length,
        page: 1,
        pageSize: 2,
        items: expectedOrder.slice(0, 2).map((fixture) => ({
          id: fixture.id,
          name: fixture.name,
          color: fixture.color,
          namingPattern: fixture.namingPattern,
          releaseScope: fixture.releaseScope,
        })),
      });
      expect(
        (mockDb.releaseComponent as { findMany: jest.Mock }).findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
          skip: 0,
          take: 2,
          select: {
            id: true,
            name: true,
            color: true,
            namingPattern: true,
            releaseScope: true,
            createdAt: true,
          },
        }),
      );
    });
  });

  describe("GET /api/v1/release-components/:id", () => {
    it("returns a single component", async () => {
      authMock.mockResolvedValue(authenticatedSession);
      const fixture = releaseComponentFixtures.desktopAngularJs;
      const record = toReleaseComponentDbRow(fixture);
      setComponentRecords([record]);

      const request = new NextRequest(
        `http://test/api/v1/release-components/${fixture.id}`,
        { method: "GET" },
      );

      const response = await executeHandler(getReleaseComponent, request, {
        componentId: record.id,
      });
      const payload = await parseJsonObject(response);

      expect(response.status).toBe(200);
      expect(payload).toMatchObject({
        id: fixture.id,
        name: fixture.name,
        color: fixture.color,
        namingPattern: fixture.namingPattern,
        releaseScope: fixture.releaseScope,
        createdAt: record.createdAt.toISOString(),
      });
    });
  });

  describe("POST /api/v1/release-components", () => {
    it("creates a release component for an authenticated user", async () => {
      authMock.mockResolvedValue(authenticatedSession);

      const request = new NextRequest("http://test/api/v1/release-components", {
        method: "POST",
        body: JSON.stringify({
          name: "  Scheduler ",
          color: "teal",
          namingPattern: "{release_version}-{built_version}-{increment}",
          releaseScope: "version-bound",
        }),
        headers: {
          "Content-Type": "application/json",
          cookie: "next-auth.session-token=test-token",
        },
      });

      const response = await executeHandler(createReleaseComponent, request);
      const payload = await parseJsonObject(response);

      expect(response.status).toBe(201);
      expect(payload).toMatchObject({
        name: "Scheduler",
        color: "teal",
        namingPattern: "{release_version}-{built_version}-{increment}",
        releaseScope: "version-bound",
      });
      expect(
        (mockDb.releaseComponent as { create: jest.Mock }).create,
      ).toHaveBeenCalledWith({
        data: {
          name: "Scheduler",
          color: "teal",
          namingPattern: "{release_version}-{built_version}-{increment}",
          releaseScope: "version_bound",
          createdBy: { connect: { id: userFixtures.adamScott.id } },
        },
        select: {
          id: true,
          name: true,
          color: true,
          namingPattern: true,
          releaseScope: true,
          createdAt: true,
        },
      });
    });

    it("returns 401 when unauthenticated", async () => {
      authMock.mockResolvedValue(null);

      const request = new NextRequest("http://test/api/v1/release-components", {
        method: "POST",
        body: JSON.stringify({
          name: "Integration",
          color: "green",
          namingPattern: "{release_version}-{increment}",
          releaseScope: "global",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await executeHandler(createReleaseComponent, request);
      const payload = await parseJsonObject(response);

      expect(response.status).toBe(401);
      expect(payload).toMatchObject({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
      expect(
        (mockDb.releaseComponent as { create: jest.Mock }).create,
      ).not.toHaveBeenCalled();
    });

    it("returns 400 when payload is invalid", async () => {
      authMock.mockResolvedValue(authenticatedSession);

      const request = new NextRequest("http://test/api/v1/release-components", {
        method: "POST",
        body: JSON.stringify({
          name: "",
          color: "invalid",
          namingPattern: "",
          releaseScope: "version-bound",
        }),
        headers: {
          "Content-Type": "application/json",
          cookie: "next-auth.session-token=test-token",
        },
      });

      const response = await executeHandler(createReleaseComponent, request);
      const payload = await parseJsonObject(response);

      expect(response.status).toBe(400);
      expect(payload).toMatchObject({
        code: "VALIDATION_ERROR",
      });
      expect(
        (mockDb.releaseComponent as { create: jest.Mock }).create,
      ).not.toHaveBeenCalled();
    });

    it("returns 409 when the component name already exists", async () => {
      authMock.mockResolvedValue(authenticatedSession);
      const existing = releaseComponentFixtures.phpBackend;
      setComponentRecords([toReleaseComponentDbRow(existing)]);

      const request = new NextRequest("http://test/api/v1/release-components", {
        method: "POST",
        body: JSON.stringify({
          name: "php backend",
          color: existing.color,
          namingPattern: existing.namingPattern,
          releaseScope: "version-bound",
        }),
        headers: {
          "Content-Type": "application/json",
          cookie: "next-auth.session-token=test-token",
        },
      });

      const response = await executeHandler(createReleaseComponent, request);
      const payload = await parseJsonObject(response);

      expect(response.status).toBe(409);
      expect(payload).toMatchObject({
        code: "CONFLICT",
        message: "Release component php backend already exists",
      });
    });
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
