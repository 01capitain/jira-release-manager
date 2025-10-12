import type { Session } from "next-auth";
import { NextRequest } from "next/server";

jest.mock("superjson", () => ({
  __esModule: true,
  default: {
    serialize: jest.fn((value: unknown) => ({ json: value })),
    deserialize: jest.fn((payload: unknown) => payload),
  },
}));

type BuiltVersionRecord = {
  id: string;
  name: string;
  versionId: string;
  createdAt: Date;
};

type ReleaseRecord = {
  id: string;
  name: string;
  createdAt: Date;
  builtVersions?: BuiltVersionRecord[];
  lastUsedIncrement?: number;
};

const releaseData: ReleaseRecord[] = [];
let releaseCounter = 0;
let builtCounter = 0;

const cloneReleaseRecord = (record: ReleaseRecord): ReleaseRecord => ({
  ...record,
  builtVersions: record.builtVersions
    ? record.builtVersions.map((built) => ({ ...built }))
    : [],
  lastUsedIncrement: record.lastUsedIncrement,
});

const setReleaseRecords = (records: ReleaseRecord[]) => {
  releaseData.splice(0, releaseData.length, ...records.map(cloneReleaseRecord));
  releaseCounter = releaseData.length;
  builtCounter = releaseData.reduce(
    (total, record) => total + (record.builtVersions?.length ?? 0),
    0,
  );
};

const clearReleaseRecords = () => {
  releaseData.splice(0, releaseData.length);
  releaseCounter = 0;
  builtCounter = 0;
};

type JsonResponse = {
  json: () => Promise<unknown>;
};

const recordContaining = (value: Record<string, unknown>) => {
  return expect.objectContaining(value) as Record<string, unknown>;
};

async function parseJsonObject(
  response: JsonResponse,
): Promise<Record<string, unknown>> {
  const json: unknown = await response.json();
  if (!json || typeof json !== "object") {
    throw new Error("Expected JSON object payload");
  }
  return json as Record<string, unknown>;
}

const authenticatedSession: Session = {
  user: { id: "user-123", name: "Test User" },
  expires: "2099-01-01T00:00:00.000Z",
};

const mockDb: Record<string, unknown> = {};

mockDb.releaseVersion = {
  count: jest.fn(async () => releaseData.length),
  findMany: jest.fn(
    async ({
      orderBy,
      skip = 0,
      take,
    }: {
      orderBy?: { createdAt?: "asc" | "desc"; name?: "asc" | "desc" };
      skip?: number;
      take?: number;
    } = {}) => {
      const field: "createdAt" | "name" = orderBy?.createdAt
        ? "createdAt"
        : orderBy?.name
          ? "name"
          : "createdAt";
      const direction = orderBy?.[field] ?? "asc";
      const sorted = [...releaseData].sort((a, b) => {
        const multiplier = direction === "desc" ? -1 : 1;
        if (field === "name") {
          return a.name.localeCompare(b.name) * multiplier;
        }
        return (a.createdAt.getTime() - b.createdAt.getTime()) * multiplier;
      });
      const limit = typeof take === "number" ? take : sorted.length;
      return sorted
        .slice(skip, skip + limit)
        .map(({ id, name, createdAt }) => ({
          id,
          name,
          createdAt,
        }));
    },
  ),
  findUnique: jest.fn(async ({ where }: { where?: { id?: string } } = {}) => {
    const record = releaseData.find((entry) => entry.id === where?.id);
    if (!record) return null;
    const builtVersions = [...(record.builtVersions ?? [])].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    return {
      id: record.id,
      name: record.name,
      createdAt: record.createdAt,
      builtVersions,
    };
  }),
  create: jest.fn(async ({ data }: { data?: Record<string, unknown> } = {}) => {
    releaseCounter += 1;
    const id =
      (data?.id as string | undefined) ??
      `018f1a50-0000-7000-8000-${releaseCounter
        .toString(16)
        .padStart(12, "0")}`;
    const createdAt =
      data?.createdAt instanceof Date
        ? data.createdAt
        : new Date(
            `2024-05-${(releaseCounter + 10)
              .toString()
              .padStart(2, "0")}T12:00:00.000Z`,
          );
    const name =
      (data?.name as string | undefined) ?? `Release ${releaseCounter}`;
    const record: ReleaseRecord = {
      id,
      name,
      createdAt,
      builtVersions: [],
    };
    releaseData.push(record);
    return { id: record.id, name: record.name, createdAt: record.createdAt };
  }),
  update: jest.fn(
    async ({
      where,
      data,
    }: {
      where?: { id?: string };
      data?: Record<string, unknown>;
    } = {}) => {
      const record = releaseData.find((entry) => entry.id === where?.id);
      if (record && typeof data?.lastUsedIncrement === "number") {
        record.lastUsedIncrement = data.lastUsedIncrement;
      }
      return { id: where?.id, ...data };
    },
  ),
};

mockDb.builtVersion = {
  create: jest.fn(async ({ data }: { data?: Record<string, unknown> } = {}) => {
    builtCounter += 1;
    const versionId =
      (data?.version as { connect?: { id?: string } } | undefined)?.connect
        ?.id ?? "";
    const built: BuiltVersionRecord = {
      id: `018f1a50-0000-7000-9000-${builtCounter
        .toString(16)
        .padStart(12, "0")}`,
      name: (data?.name as string | undefined) ?? `Built ${builtCounter}`,
      versionId,
      createdAt: new Date(
        `2024-06-${(builtCounter + 10).toString().padStart(2, "0")}T08:00:00.000Z`,
      ),
    };
    const release = releaseData.find((entry) => entry.id === versionId);
    if (release) {
      release.builtVersions = release.builtVersions ?? [];
      release.builtVersions.unshift(built);
    }
    return built;
  }),
};

mockDb.releaseComponent = {
  findMany: jest.fn(async () => []),
};

mockDb.componentVersion = {
  create: jest.fn(async () => ({})),
};

mockDb.$transaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
  return await fn(mockDb);
});

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
  GET as listReleaseVersions,
  POST as createReleaseVersion,
} from "~/app/api/v1/release-versions/route";
import { GET as getReleaseVersion } from "~/app/api/v1/release-versions/[releaseId]/route";
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

describe("Release Versions REST endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearReleaseRecords();
    authMock.mockReset();
  });

  describe("GET /api/v1/release-versions", () => {
    it("returns a paginated list sorted by createdAt descending", async () => {
      authMock.mockResolvedValue(authenticatedSession);
      const records: ReleaseRecord[] = [
        {
          id: "018f1a50-0000-7000-8000-000000000001",
          name: "Release 001",
          createdAt: new Date("2024-05-01T12:00:00.000Z"),
        },
        {
          id: "018f1a50-0000-7000-8000-000000000002",
          name: "Release 002",
          createdAt: new Date("2024-05-02T12:00:00.000Z"),
        },
        {
          id: "018f1a50-0000-7000-8000-000000000003",
          name: "Release 003",
          createdAt: new Date("2024-05-03T12:00:00.000Z"),
        },
      ];
      setReleaseRecords(records);

      const request = new NextRequest(
        "http://test/api/v1/release-versions?page=1&pageSize=2&sortBy=-createdAt",
        {
          method: "GET",
        },
      );

      const response = await executeHandler(listReleaseVersions, request);
      const payload = await parseJsonObject(response);

      expect(response.status).toBe(200);
      expect(payload).toMatchObject({
        data: [
          {
            id: records[2]?.id,
            name: records[2]?.name,
            createdAt: records[2]?.createdAt.toISOString(),
          },
          {
            id: records[1]?.id,
            name: records[1]?.name,
            createdAt: records[1]?.createdAt.toISOString(),
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
        (mockDb.releaseVersion as Record<string, unknown>).findMany,
      ).toHaveBeenCalledWith(
        recordContaining({
          orderBy: { createdAt: "desc" },
          skip: 0,
          take: 2,
          select: { id: true, name: true, createdAt: true },
        }),
      );
    });

    it("returns 400 when pagination parameters are invalid", async () => {
      authMock.mockResolvedValue(authenticatedSession);
      const request = new NextRequest(
        "http://test/api/v1/release-versions?page=0&pageSize=0",
      );

      const response = await executeHandler(listReleaseVersions, request);
      const payload = await parseJsonObject(response);

      expect(response.status).toBe(400);
      expect(payload).toMatchObject({
        code: "VALIDATION_ERROR",
        message: "Invalid request payload",
      });
      expect(
        (mockDb.releaseVersion as Record<string, unknown>).findMany,
      ).not.toHaveBeenCalled();
    });

    it("returns 401 when unauthenticated", async () => {
      authMock.mockResolvedValue(null);
      const request = new NextRequest("http://test/api/v1/release-versions", {
        method: "GET",
      });

      const response = await executeHandler(listReleaseVersions, request);
      const payload = await parseJsonObject(response);

      expect(response.status).toBe(401);
      expect(payload).toMatchObject({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
      expect(
        (mockDb.releaseVersion as Record<string, unknown>).count,
      ).not.toHaveBeenCalled();
      expect(
        (mockDb.releaseVersion as Record<string, unknown>).findMany,
      ).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/v1/release-versions", () => {
    it("creates a release version for an authenticated user", async () => {
      authMock.mockResolvedValue(authenticatedSession);

      const request = new NextRequest("http://test/api/v1/release-versions", {
        method: "POST",
        body: JSON.stringify({ name: "  Release 100  " }),
        headers: {
          "Content-Type": "application/json",
          cookie: "next-auth.session-token=test-token",
        },
      });

      const response = await executeHandler(createReleaseVersion, request);
      const payload = await parseJsonObject(response);

      expect(response.status).toBe(201);
      expect(payload).toMatchObject({
        name: "Release 100",
      });
      expect(typeof payload.createdAt).toBe("string");
      expect(
        (mockDb.releaseVersion as Record<string, unknown>).create,
      ).toHaveBeenCalledWith({
        data: {
          name: "Release 100",
          createdBy: { connect: { id: "user-123" } },
        },
        select: { id: true, name: true, createdAt: true },
      });
      expect(
        (mockDb.builtVersion as { create: jest.Mock }).create,
      ).toHaveBeenCalledWith({
        data: recordContaining({ name: "Release 100.0" }),
        select: { id: true, name: true },
      });
    });

    it("returns 401 when unauthenticated", async () => {
      authMock.mockResolvedValue(null);

      const request = new NextRequest("http://test/api/v1/release-versions", {
        method: "POST",
        body: JSON.stringify({ name: "Release 101" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await executeHandler(createReleaseVersion, request);
      const payload = await parseJsonObject(response);

      expect(response.status).toBe(401);
      expect(payload).toMatchObject({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
      expect(
        (mockDb.releaseVersion as Record<string, unknown>).create,
      ).not.toHaveBeenCalled();
      expect(
        (mockDb.builtVersion as Record<string, unknown>).create,
      ).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/v1/release-versions/{releaseId}", () => {
    it("returns release details with built versions", async () => {
      authMock.mockResolvedValue(authenticatedSession);
      const releaseId = "018f1a50-0000-7000-8000-0000000000aa";
      setReleaseRecords([
        {
          id: releaseId,
          name: "Release Detail",
          createdAt: new Date("2024-05-10T10:00:00.000Z"),
          builtVersions: [
            {
              id: "018f1a50-0000-7000-9000-0000000000ab",
              name: "Release Detail.1",
              versionId: releaseId,
              createdAt: new Date("2024-05-11T10:00:00.000Z"),
            },
          ],
        },
      ]);

      const request = new NextRequest(
        `http://test/api/v1/release-versions/${releaseId}`,
      );

      const response = await executeHandler(getReleaseVersion, request, {
        releaseId,
      });
      const payload = await parseJsonObject(response);

      expect(response.status).toBe(200);
      expect(payload).toMatchObject({
        id: releaseId,
        name: "Release Detail",
        createdAt: "2024-05-10T10:00:00.000Z",
        builtVersions: [
          {
            id: "018f1a50-0000-7000-9000-0000000000ab",
            name: "Release Detail.1",
            versionId: releaseId,
            createdAt: "2024-05-11T10:00:00.000Z",
          },
        ],
      });
    });

    it("returns 404 when the release does not exist", async () => {
      authMock.mockResolvedValue(authenticatedSession);
      const releaseId = "018f1a50-0000-7000-8000-0000000000ff";

      const request = new NextRequest(
        `http://test/api/v1/release-versions/${releaseId}`,
      );

      const response = await executeHandler(getReleaseVersion, request, {
        releaseId,
      });
      const payload = await parseJsonObject(response);

      expect(response.status).toBe(404);
      expect(payload).toMatchObject({
        code: "NOT_FOUND",
        message: `Release version ${releaseId} not found`,
      });
    });

    it("returns 401 when unauthenticated", async () => {
      authMock.mockResolvedValue(null);
      const releaseId = "018f1a50-0000-7000-8000-00000000ffff";

      const request = new NextRequest(
        `http://test/api/v1/release-versions/${releaseId}`,
      );

      const response = await executeHandler(getReleaseVersion, request, {
        releaseId,
      });
      const payload = await parseJsonObject(response);

      expect(response.status).toBe(401);
      expect(payload).toMatchObject({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
      expect(
        (mockDb.releaseVersion as Record<string, unknown>).findUnique,
      ).not.toHaveBeenCalled();
    });
  });
});
