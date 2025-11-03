import type { Session } from "next-auth";
import { NextRequest } from "next/server";
import {
  releaseComponentFixtureList,
  releaseComponentFixtures,
} from "../fixtures/release-components";
import { userFixtures } from "../fixtures/users";

jest.mock("superjson", () => ({
  __esModule: true,
  default: {
    serialize: jest.fn((value: unknown) => ({ json: value })),
    deserialize: jest.fn((payload: unknown) => payload),
  },
}));

type UserRecord = {
  id: string;
  name?: string | null;
  email?: string | null;
};

type ComponentVersionRecord = {
  id: string;
  releaseComponentId: string;
  builtVersionId: string;
  name: string;
  increment: number;
  createdAt: Date;
};

type BuiltVersionTransitionRecord = {
  id: string;
  builtVersionId: string;
  fromStatus: string;
  toStatus: string;
  action: string;
  createdAt: Date;
  createdById: string;
};

type BuiltVersionRecord = {
  id: string;
  name: string;
  versionId: string;
  createdAt: Date;
  componentVersions?: ComponentVersionRecord[];
  transitions?: BuiltVersionTransitionRecord[];
};

type ReleaseRecord = {
  id: string;
  name: string;
  createdAt: Date;
  builtVersions?: BuiltVersionRecord[];
  createdBy?: UserRecord;
  lastUsedIncrement?: number;
};

const releaseData: ReleaseRecord[] = [];
let releaseCounter = 0;
let builtCounter = 0;
const COMPONENT_A_ID = releaseComponentFixtures.iosApp.id;
const COMPONENT_B_ID = releaseComponentFixtures.phpBackend.id;
const COMPONENT_VERSION_ID = "018f1a50-0000-7000-9000-00000000c0d1";
const COMPONENT_VERSION_ID_2 = "018f1a50-0000-7000-9000-00000000c0d2";
const USER_1_ID = userFixtures.adamScott.id;
const USER_2_ID = userFixtures.melanieMayer.id;
const SESSION_USER_ID = userFixtures.adamScott.id;
const TRANSITION_ID = "018f1a50-0000-7000-9000-00000000d1b1";
const USER_3_ID = "018f1a50-0000-7000-9000-00000000d0a3";
const TRANSITION_ID_2 = "018f1a50-0000-7000-9000-00000000d1b2";

const cloneComponentVersion = (
  record: ComponentVersionRecord,
): ComponentVersionRecord => ({ ...record });

const cloneTransition = (
  record: BuiltVersionTransitionRecord,
): BuiltVersionTransitionRecord => ({ ...record });

const cloneBuiltVersionRecord = (
  record: BuiltVersionRecord,
): BuiltVersionRecord => ({
  ...record,
  componentVersions: record.componentVersions
    ? record.componentVersions.map(cloneComponentVersion)
    : undefined,
  transitions: record.transitions
    ? record.transitions.map(cloneTransition)
    : undefined,
});

const cloneReleaseRecord = (record: ReleaseRecord): ReleaseRecord => ({
  ...record,
  builtVersions: record.builtVersions
    ? record.builtVersions.map(cloneBuiltVersionRecord)
    : [],
  createdBy: record.createdBy ? { ...record.createdBy } : undefined,
  lastUsedIncrement: record.lastUsedIncrement,
});

const sortByCreatedAt = <T extends { createdAt: Date }>(
  records: T[],
  direction: "asc" | "desc" = "asc",
) => {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...records].sort(
    (a, b) => (a.createdAt.getTime() - b.createdAt.getTime()) * multiplier,
  );
};

const materializeBuiltVersion = (
  record: BuiltVersionRecord,
  args?: {
    select?: {
      componentVersions?: { orderBy?: { createdAt?: "asc" | "desc" } };
      BuiltVersionTransition?: { orderBy?: { createdAt?: "asc" | "desc" } };
    };
  },
) => {
  const base = {
    id: record.id,
    name: record.name,
    versionId: record.versionId,
    createdAt: record.createdAt,
  } as Record<string, unknown>;

  if (args?.select?.componentVersions) {
    const ordered = sortByCreatedAt(
      record.componentVersions ?? [],
      args.select.componentVersions.orderBy?.createdAt ?? "asc",
    );
    base.componentVersions = ordered.map((entry) => ({ ...entry }));
  }
  if (args?.select?.BuiltVersionTransition) {
    const ordered = sortByCreatedAt(
      record.transitions ?? [],
      args.select.BuiltVersionTransition.orderBy?.createdAt ?? "asc",
    );
    base.BuiltVersionTransition = ordered.map((entry) => ({ ...entry }));
  }
  return base;
};

const materializeRelease = (
  record: ReleaseRecord,
  args?: {
    include?: {
      createdBy?: unknown;
      builtVersions?: {
        orderBy?: { createdAt?: "asc" | "desc" };
        select?: {
          componentVersions?: { orderBy?: { createdAt?: "asc" | "desc" } };
          BuiltVersionTransition?: { orderBy?: { createdAt?: "asc" | "desc" } };
        };
      };
    };
  },
) => {
  const base: Record<string, unknown> = {
    id: record.id,
    name: record.name,
    createdAt: record.createdAt,
  };

  if (args?.include?.createdBy) {
    base.createdBy = record.createdBy ? { ...record.createdBy } : null;
  }
  if (args?.include?.builtVersions) {
    const direction = args.include.builtVersions.orderBy?.createdAt ?? "asc";
    const ordered = sortByCreatedAt(record.builtVersions ?? [], direction);
    base.builtVersions = ordered.map((entry) =>
      materializeBuiltVersion(entry, args.include?.builtVersions),
    );
  }

  return base;
};

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
  user: { id: SESSION_USER_ID, name: userFixtures.adamScott.name },
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
      include,
    }: {
      orderBy?: { createdAt?: "asc" | "desc"; name?: "asc" | "desc" };
      skip?: number;
      take?: number;
      include?: {
        createdBy?: unknown;
        builtVersions?: {
          orderBy?: { createdAt?: "asc" | "desc" };
          select?: {
            componentVersions?: { orderBy?: { createdAt?: "asc" | "desc" } };
            BuiltVersionTransition?: {
              orderBy?: { createdAt?: "asc" | "desc" };
            };
          };
        };
      };
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
        .map((record) => materializeRelease(record, { include }));
    },
  ),
  findUnique: jest.fn(
    async ({
      where,
      include,
    }: {
      where?: { id?: string };
      include?: {
        createdBy?: unknown;
        builtVersions?: {
          orderBy?: { createdAt?: "asc" | "desc" };
          select?: {
            componentVersions?: { orderBy?: { createdAt?: "asc" | "desc" } };
            BuiltVersionTransition?: {
              orderBy?: { createdAt?: "asc" | "desc" };
            };
          };
        };
      };
    } = {}) => {
      const record = releaseData.find((entry) => entry.id === where?.id);
      if (!record) return null;
      return materializeRelease(record, { include });
    },
  ),
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
  upsert: jest.fn(async () => ({})),
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
import {
  ReleaseVersionDetailSchema,
  ReleaseVersionListResponseSchema,
} from "~/server/rest/controllers/release-versions.controller";

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
      const parsed = ReleaseVersionListResponseSchema.parse(payload);

      expect(response.status).toBe(200);
      expect(parsed).toMatchObject({
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
      expect(parsed.data[0]).not.toHaveProperty("builtVersions");
      const findManyCalls = (mockDb.releaseVersion as { findMany: jest.Mock })
        .findMany.mock.calls as Array<[Record<string, unknown>]>;
      const args = findManyCalls[0]?.[0] ?? {};
      expect(args).toMatchObject({
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 2,
        select: { id: true, name: true, createdAt: true },
      });
      expect((args as { include?: unknown }).include).toBeUndefined();
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

    it("includes requested relations when relations query params are provided", async () => {
      authMock.mockResolvedValue(authenticatedSession);
      const releaseId = "018f1a50-0000-7000-8000-000000001111";
      const builtId = "018f1a50-0000-7000-9000-000000001112";
      setReleaseRecords([
        {
          id: releaseId,
          name: "Release With Relations",
          createdAt: new Date("2024-06-01T09:00:00.000Z"),
          createdBy: {
            id: USER_1_ID,
            name: "Owner",
            email: "owner@example.com",
          },
          builtVersions: [
            {
              id: builtId,
              name: "Release With Relations.0",
              versionId: releaseId,
              createdAt: new Date("2024-06-02T09:00:00.000Z"),
              componentVersions: [
                {
                  id: COMPONENT_VERSION_ID,
                  releaseComponentId: COMPONENT_A_ID,
                  builtVersionId: builtId,
                  name: "component-a",
                  increment: 0,
                  createdAt: new Date("2024-06-02T10:00:00.000Z"),
                },
              ],
              transitions: [
                {
                  id: TRANSITION_ID,
                  builtVersionId: builtId,
                  fromStatus: "in_development",
                  toStatus: "in_deployment",
                  action: "start_deployment",
                  createdAt: new Date("2024-06-02T11:00:00.000Z"),
                  createdById: USER_2_ID,
                },
              ],
            },
          ],
        },
      ]);

      const request = new NextRequest(
        "http://test/api/v1/release-versions?relations=creater&relations=builtVersions&relations=builtVersions.deployedComponents&relations=builtVersions.transitions",
      );

      const response = await executeHandler(listReleaseVersions, request);
      const payload = await parseJsonObject(response);
      const parsed = ReleaseVersionListResponseSchema.parse(payload);

      expect(response.status).toBe(200);
      expect(parsed.data[0]?.creater).toEqual({
        id: USER_1_ID,
        name: "Owner",
        email: "owner@example.com",
      });
      expect(parsed.data[0]?.builtVersions?.[0]).toMatchObject({
        id: builtId,
        deployedComponents: [
          expect.objectContaining({
            releaseComponentId: COMPONENT_A_ID,
            increment: 0,
          }),
        ],
        transitions: [expect.objectContaining({ action: "start_deployment" })],
      });

      const findManyCalls = (mockDb.releaseVersion as { findMany: jest.Mock })
        .findMany.mock.calls as Array<[Record<string, unknown>]>;
      const args = findManyCalls[0]?.[0] ?? {};
      const include = (
        args as {
          include?: {
            createdBy?: { select?: Record<string, boolean> };
            builtVersions?: {
              select?: Record<string, unknown>;
            };
          };
        }
      ).include;
      expect(include?.createdBy?.select).toEqual({
        id: true,
        name: true,
        email: true,
      });
      expect(include?.builtVersions?.select?.componentVersions).toBeDefined();
      expect(
        include?.builtVersions?.select?.BuiltVersionTransition,
      ).toBeDefined();
    });

    it("returns 400 when an unknown relation is requested", async () => {
      authMock.mockResolvedValue(authenticatedSession);
      const request = new NextRequest(
        "http://test/api/v1/release-versions?relations=unknownRelation",
      );

      const response = await executeHandler(listReleaseVersions, request);
      const payload = await parseJsonObject(response);
      const errorPayload = payload as {
        code?: string;
        message?: string;
        details?: Record<string, unknown>;
      };

      expect(response.status).toBe(400);
      expect(errorPayload).toMatchObject({
        code: "INVALID_RELATION",
        message: "Invalid relations requested",
      });
      expect(
        errorPayload.details?.invalidRelations as string[] | undefined,
      ).toContain("unknownRelation");

      const nestedOnlyRequest = new NextRequest(
        "http://test/api/v1/release-versions?relations=builtVersions.deployedComponents",
      );
      const nestedOnlyResponse = await executeHandler(
        listReleaseVersions,
        nestedOnlyRequest,
      );
      const nestedPayload = await parseJsonObject(nestedOnlyResponse);
      const nestedError = nestedPayload as {
        details?: Record<string, unknown>;
      };
      expect(nestedOnlyResponse.status).toBe(400);
      expect(
        nestedError.details?.missingParentRelations as string[] | undefined,
      ).toContain("builtVersions.deployedComponents");
    });
  });

  describe("POST /api/v1/release-versions", () => {
    it("creates a release version for an authenticated user", async () => {
      authMock.mockResolvedValue(authenticatedSession);

      (
        mockDb.releaseComponent as { findMany: jest.Mock }
      ).findMany.mockResolvedValue([]);
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
          createdBy: { connect: { id: SESSION_USER_ID } },
        },
        select: { id: true, name: true, createdAt: true },
      });
      expect(
        (mockDb.builtVersion as { create: jest.Mock }).create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Release 100.0",
            createdBy: { connect: { id: SESSION_USER_ID } },
            version: expect.objectContaining({
              connect: expect.objectContaining({ id: expect.any(String) }),
            }),
            tokenValues: {
              release_version: "Release 100",
              increment: 0,
            },
          }),
          select: {
            id: true,
            name: true,
            versionId: true,
            createdAt: true,
          },
        }),
      );
    });

    it("seeds component versions for all release components", async () => {
      authMock.mockResolvedValue(authenticatedSession);
      const components = releaseComponentFixtureList.map((fixture) => ({
        id: fixture.id,
        namingPattern: fixture.namingPattern,
        releaseScope:
          fixture.releaseScope === "version-bound" ? "version_bound" : "global",
      }));
      (
        mockDb.releaseComponent as { findMany: jest.Mock }
      ).findMany.mockResolvedValue(components);

      const request = new NextRequest("http://test/api/v1/release-versions", {
        method: "POST",
        body: JSON.stringify({ name: "Release 200" }),
        headers: {
          "Content-Type": "application/json",
          cookie: "next-auth.session-token=test-token",
        },
      });

      const response = await executeHandler(createReleaseVersion, request);
      expect(response.status).toBe(201);

      const upsertCalls = (mockDb.componentVersion as { upsert: jest.Mock })
        .upsert.mock.calls as Array<
        [
          {
            where: {
              builtVersionId_releaseComponentId: {
                builtVersionId: string;
                releaseComponentId: string;
              };
            };
            create: {
              releaseComponent: { connect: { id: string } };
              increment: number;
            };
          },
        ]
      >;
      expect(upsertCalls).toHaveLength(releaseComponentFixtureList.length);
      const seededIds = new Set(
        upsertCalls.map(([args]) => args.create.releaseComponent.connect.id),
      );
      expect(seededIds).toEqual(
        new Set(releaseComponentFixtureList.map((fixture) => fixture.id)),
      );
      upsertCalls.forEach(([args]) => {
        expect(args.create.increment).toBe(0);
        expect(
          args.where.builtVersionId_releaseComponentId.releaseComponentId,
        ).toBe(args.create.releaseComponent.connect.id);
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
    it("returns release details without relations by default", async () => {
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
          createdBy: { id: USER_1_ID, name: "Detail Owner", email: null },
        },
      ]);

      const request = new NextRequest(
        `http://test/api/v1/release-versions/${releaseId}`,
      );

      const response = await executeHandler(getReleaseVersion, request, {
        releaseId,
      });
      const payload = await parseJsonObject(response);
      const parsed = ReleaseVersionDetailSchema.parse(payload);

      expect(response.status).toBe(200);
      expect(parsed).toMatchObject({
        id: releaseId,
        name: "Release Detail",
        createdAt: "2024-05-10T10:00:00.000Z",
      });
      expect(parsed).not.toHaveProperty("builtVersions");
      expect(parsed).not.toHaveProperty("creater");
    });

    it("returns release details with relations when requested", async () => {
      authMock.mockResolvedValue(authenticatedSession);
      const releaseId = "018f1a50-0000-7000-8000-0000000000bb";
      const builtId = "018f1a50-0000-7000-9000-0000000000bc";
      setReleaseRecords([
        {
          id: releaseId,
          name: "Release Detail Relations",
          createdAt: new Date("2024-05-12T08:00:00.000Z"),
          createdBy: {
            id: USER_3_ID,
            name: "Owner",
            email: "owner@example.com",
          },
          builtVersions: [
            {
              id: builtId,
              name: "Release Detail Relations.0",
              versionId: releaseId,
              createdAt: new Date("2024-05-13T08:00:00.000Z"),
              componentVersions: [
                {
                  id: COMPONENT_VERSION_ID_2,
                  releaseComponentId: COMPONENT_A_ID,
                  builtVersionId: builtId,
                  name: "component-b",
                  increment: 1,
                  createdAt: new Date("2024-05-13T09:00:00.000Z"),
                },
              ],
              transitions: [
                {
                  id: TRANSITION_ID_2,
                  builtVersionId: builtId,
                  fromStatus: "in_deployment",
                  toStatus: "active",
                  action: "mark_active",
                  createdAt: new Date("2024-05-13T10:00:00.000Z"),
                  createdById: USER_2_ID,
                },
              ],
            },
          ],
        },
      ]);

      const request = new NextRequest(
        `http://test/api/v1/release-versions/${releaseId}?relations=creater&relations=builtVersions&relations=builtVersions.deployedComponents&relations=builtVersions.transitions`,
      );

      const response = await executeHandler(getReleaseVersion, request, {
        releaseId,
      });
      const payload = await parseJsonObject(response);
      const parsed = ReleaseVersionDetailSchema.parse(payload);

      expect(response.status).toBe(200);
      expect(parsed.creater).toEqual({
        id: USER_3_ID,
        name: "Owner",
        email: "owner@example.com",
      });
      expect(parsed.builtVersions?.[0]).toMatchObject({
        id: builtId,
        deployedComponents: [expect.objectContaining({ increment: 1 })],
        transitions: [expect.objectContaining({ action: "mark_active" })],
      });
      const findUniqueCalls = (
        mockDb.releaseVersion as { findUnique: jest.Mock }
      ).findUnique.mock.calls as Array<[Record<string, unknown>]>;
      const args = findUniqueCalls.at(-1)?.[0] ?? {};
      const include = (
        args as {
          include?: {
            builtVersions?: { select?: Record<string, unknown> };
          };
        }
      ).include;
      expect(include?.builtVersions?.select?.componentVersions).toBeDefined();
    });

    it("returns 400 for invalid relations on detail endpoint", async () => {
      authMock.mockResolvedValue(authenticatedSession);
      const releaseId = "018f1a50-0000-7000-8000-00000000cccc";

      const request = new NextRequest(
        `http://test/api/v1/release-versions/${releaseId}?relations=invalid`,
      );

      const response = await executeHandler(getReleaseVersion, request, {
        releaseId,
      });
      const payload = await parseJsonObject(response);
      const errorPayload = payload as { code?: string };

      expect(response.status).toBe(400);
      expect(errorPayload.code).toBe("INVALID_RELATION");
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
