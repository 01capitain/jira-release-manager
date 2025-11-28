import type { Session } from "next-auth";
import { NextRequest } from "next/server";
import {
  releaseComponentFixtureList,
  releaseComponentFixtures,
} from "../fixtures/release-components";
import { userFixtures } from "../fixtures/users";
import {
  DEFAULT_RELEASE_TRACK,
  type ReleaseTrack,
} from "~/shared/types/release-track";

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
  patchId: string;
  name: string;
  increment: number;
  createdAt: Date;
};

type PatchTransitionRecord = {
  id: string;
  patchId: string;
  fromStatus: string;
  toStatus: string;
  action: string;
  createdAt: Date;
  createdById: string;
};

type PatchRecord = {
  id: string;
  name: string;
  versionId: string;
  createdAt: Date;
  currentStatus?: string;
  componentVersions?: ComponentVersionRecord[];
  transitions?: PatchTransitionRecord[];
};

type ReleaseRecord = {
  id: string;
  name: string;
  createdAt: Date;
  releaseTrack: ReleaseTrack;
  patches?: PatchRecord[];
  createdBy?: UserRecord;
  lastUsedIncrement?: number;
};

type ReleaseRecordInput = Omit<ReleaseRecord, "releaseTrack"> & {
  releaseTrack?: ReleaseTrack;
};

const releaseData: ReleaseRecord[] = [];
let releaseCounter = 0;
let patchCounter = 0;
const COMPONENT_A_ID = releaseComponentFixtures.iosApp.id;
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
  record: PatchTransitionRecord,
): PatchTransitionRecord => ({ ...record });

const clonePatchRecord = (record: PatchRecord): PatchRecord => ({
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
  patches: record.patches ? record.patches.map(clonePatchRecord) : [],
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

const materializePatch = (
  record: PatchRecord,
  args?: {
    select?: {
      componentVersions?: { orderBy?: { createdAt?: "asc" | "desc" } };
      PatchTransition?: { orderBy?: { createdAt?: "asc" | "desc" } };
    };
  },
) => {
  const base = {
    id: record.id,
    name: record.name,
    versionId: record.versionId,
    createdAt: record.createdAt,
    currentStatus: record.currentStatus,
  } as Record<string, unknown>;

  if (args?.select?.componentVersions) {
    const ordered = sortByCreatedAt(
      record.componentVersions ?? [],
      args.select.componentVersions.orderBy?.createdAt ?? "asc",
    );
    base.componentVersions = ordered.map((entry) => ({ ...entry }));
  }
  if (args?.select?.PatchTransition) {
    const ordered = sortByCreatedAt(
      record.transitions ?? [],
      args.select.PatchTransition.orderBy?.createdAt ?? "asc",
    );
    base.PatchTransition = ordered.map((entry) => ({ ...entry }));
  }
  return base;
};

const materializeRelease = (
  record: ReleaseRecord,
  args?: {
    include?: {
      createdBy?: unknown;
      patches?: {
        orderBy?: { createdAt?: "asc" | "desc" };
        select?: {
          componentVersions?: { orderBy?: { createdAt?: "asc" | "desc" } };
          PatchTransition?: { orderBy?: { createdAt?: "asc" | "desc" } };
        };
      };
    };
  },
) => {
  const base: Record<string, unknown> = {
    id: record.id,
    name: record.name,
    releaseTrack: record.releaseTrack,
    createdAt: record.createdAt,
  };

  if (args?.include?.createdBy) {
    base.createdBy = record.createdBy ? { ...record.createdBy } : null;
  }
  if (args?.include?.patches) {
    const direction = args.include.patches.orderBy?.createdAt ?? "asc";
    const ordered = sortByCreatedAt(record.patches ?? [], direction);
    base.patches = ordered.map((entry) =>
      materializePatch(entry, args.include?.patches),
    );
  }

  return base;
};

const setReleaseRecords = (records: ReleaseRecordInput[]) => {
  releaseData.splice(
    0,
    releaseData.length,
    ...records.map((record) =>
      cloneReleaseRecord({
        ...record,
        releaseTrack: record.releaseTrack ?? DEFAULT_RELEASE_TRACK,
      }),
    ),
  );
  releaseCounter = releaseData.length;
  patchCounter = releaseData.reduce(
    (total, record) => total + (record.patches?.length ?? 0),
    0,
  );
};

const clearReleaseRecords = () => {
  releaseData.splice(0, releaseData.length);
  releaseCounter = 0;
  patchCounter = 0;
};

type JsonResponse = {
  json: () => Promise<unknown>;
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
        patches?: {
          orderBy?: { createdAt?: "asc" | "desc" };
          select?: {
            componentVersions?: { orderBy?: { createdAt?: "asc" | "desc" } };
            PatchTransition?: {
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
        patches?: {
          orderBy?: { createdAt?: "asc" | "desc" };
          select?: {
            componentVersions?: { orderBy?: { createdAt?: "asc" | "desc" } };
            PatchTransition?: {
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
    const releaseTrack =
      (data?.releaseTrack as ReleaseTrack | undefined) ?? DEFAULT_RELEASE_TRACK;
    const record: ReleaseRecord = {
      id,
      name,
      releaseTrack,
      createdAt,
      patches: [],
    };
    releaseData.push(record);
    return {
      id: record.id,
      name: record.name,
      releaseTrack: record.releaseTrack,
      createdAt: record.createdAt,
    };
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
      if (record) {
        if (typeof data?.lastUsedIncrement === "number") {
          record.lastUsedIncrement = data.lastUsedIncrement;
        }
        if (typeof data?.releaseTrack === "string") {
          record.releaseTrack = data.releaseTrack as ReleaseTrack;
          return {
            id: record.id,
            name: record.name,
            releaseTrack: record.releaseTrack,
            createdAt: record.createdAt,
          };
        }
      }
      return { id: where?.id, ...data };
    },
  ),
};

mockDb.patch = {
  create: jest.fn(async ({ data }: { data?: Record<string, unknown> } = {}) => {
    patchCounter += 1;
    const versionId =
      (data?.version as { connect?: { id?: string } } | undefined)?.connect
        ?.id ?? "";
    const patch: PatchRecord = {
      id: `018f1a50-0000-7000-9000-${patchCounter
        .toString(16)
        .padStart(12, "0")}`,
      name: (data?.name as string | undefined) ?? `Patch ${patchCounter}`,
      versionId,
      createdAt: new Date(
        `2024-06-${(patchCounter + 10).toString().padStart(2, "0")}T08:00:00.000Z`,
      ),
    };
    const release = releaseData.find((entry) => entry.id === versionId);
    if (release) {
      release.patches = release.patches ?? [];
      release.patches.unshift(patch);
    }
    return patch;
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
import { PATCH as updateReleaseVersionTrack } from "~/app/api/v1/release-versions/[releaseId]/track/route";
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
      const records: ReleaseRecordInput[] = [
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
      expect(parsed.data[0]).not.toHaveProperty("patches");
      const findManyCalls = (mockDb.releaseVersion as { findMany: jest.Mock })
        .findMany.mock.calls as Array<[Record<string, unknown>]>;
      const args = findManyCalls[0]?.[0] ?? {};
      expect(args).toMatchObject({
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 2,
        select: { id: true, name: true, releaseTrack: true, createdAt: true },
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
      const patchId = "018f1a50-0000-7000-9000-000000001112";
      setReleaseRecords([
        {
          id: releaseId,
          name: "Release With Relations",
          releaseTrack: "Rollout",
          createdAt: new Date("2024-06-01T09:00:00.000Z"),
          createdBy: {
            id: USER_1_ID,
            name: "Owner",
            email: "owner@example.com",
          },
          patches: [
            {
              id: patchId,
              name: "Release With Relations.0",
              versionId: releaseId,
              createdAt: new Date("2024-06-02T09:00:00.000Z"),
              currentStatus: "in_deployment",
              componentVersions: [
                {
                  id: COMPONENT_VERSION_ID,
                  releaseComponentId: COMPONENT_A_ID,
                  patchId: patchId,
                  name: "component-a",
                  increment: 0,
                  createdAt: new Date("2024-06-02T10:00:00.000Z"),
                },
              ],
              transitions: [
                {
                  id: TRANSITION_ID,
                  patchId: patchId,
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
        "http://test/api/v1/release-versions?relations=creater&relations=patches&relations=patches.deployedComponents&relations=patches.transitions",
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
      expect(parsed.data[0]?.patches?.[0]).toMatchObject({
        id: patchId,
        deployedComponents: [
          expect.objectContaining({
            releaseComponentId: COMPONENT_A_ID,
            increment: 0,
          }),
        ],
        transitions: [expect.objectContaining({ action: "startDeployment" })],
      });

      const findManyCalls = (mockDb.releaseVersion as { findMany: jest.Mock })
        .findMany.mock.calls as Array<[Record<string, unknown>]>;
      const args = findManyCalls[0]?.[0] ?? {};
      const include = (
        args as {
          include?: {
            createdBy?: { select?: Record<string, boolean> };
            patches?: {
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
      expect(include?.patches?.select?.componentVersions).toBeDefined();
      expect(include?.patches?.select?.PatchTransition).toBeDefined();
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
        "http://test/api/v1/release-versions?relations=patches.deployedComponents",
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
      ).toContain("patches.deployedComponents");
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
          releaseTrack: DEFAULT_RELEASE_TRACK,
          createdBy: { connect: { id: SESSION_USER_ID } },
        },
        select: { id: true, name: true, releaseTrack: true, createdAt: true },
      });
      expect(
        (mockDb.patch as { create: jest.Mock }).create,
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
            currentStatus: true,
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
              patchId_releaseComponentId: {
                patchId: string;
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
        expect(args.where.patchId_releaseComponentId.releaseComponentId).toBe(
          args.create.releaseComponent.connect.id,
        );
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
        (mockDb.patch as Record<string, unknown>).create,
      ).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /api/v1/release-versions/{releaseId}/track", () => {
    it("updates the release track when authenticated", async () => {
      authMock.mockResolvedValue(authenticatedSession);
      const releaseId = "018f1a50-0000-7000-8000-000000002222";
      setReleaseRecords([
        {
          id: releaseId,
          name: "Release Track Update",
          createdAt: new Date("2024-07-01T10:00:00.000Z"),
        },
      ]);

      const request = new NextRequest(
        `http://test/api/v1/release-versions/${releaseId}/track`,
        {
          method: "PATCH",
          body: JSON.stringify({ releaseTrack: "Rollout" }),
          headers: {
            "Content-Type": "application/json",
            cookie: "next-auth.session-token=test-token",
          },
        },
      );

      const response = await executeHandler(
        updateReleaseVersionTrack,
        request,
        { releaseId },
      );
      const payload = await parseJsonObject(response);

      expect(response.status).toBe(200);
      expect(payload).toMatchObject({
        id: releaseId,
        releaseTrack: "Rollout",
      });
      expect(
        (mockDb.releaseVersion as { update: jest.Mock }).update,
      ).toHaveBeenCalledWith({
        where: { id: releaseId },
        data: { releaseTrack: "Rollout" },
        select: {
          id: true,
          name: true,
          releaseTrack: true,
          createdAt: true,
        },
      });
    });

    it("returns 401 when no session token is provided", async () => {
      authMock.mockResolvedValue(null);
      const releaseId = "018f1a50-0000-7000-8000-000000002333";
      setReleaseRecords([
        {
          id: releaseId,
          name: "Release No Auth",
          createdAt: new Date("2024-07-02T10:00:00.000Z"),
        },
      ]);

      const request = new NextRequest(
        `http://test/api/v1/release-versions/${releaseId}/track`,
        {
          method: "PATCH",
          body: JSON.stringify({ releaseTrack: "Active" }),
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const response = await executeHandler(
        updateReleaseVersionTrack,
        request,
        { releaseId },
      );
      const payload = await parseJsonObject(response);

      expect(response.status).toBe(401);
      expect(payload).toMatchObject({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
      expect(
        (mockDb.releaseVersion as { update: jest.Mock }).update,
      ).not.toHaveBeenCalled();
    });

    it("returns 404 when the release does not exist", async () => {
      authMock.mockResolvedValue(authenticatedSession);
      clearReleaseRecords();
      const releaseId = "018f1a50-0000-7000-8000-000000002444";
      const request = new NextRequest(
        `http://test/api/v1/release-versions/${releaseId}/track`,
        {
          method: "PATCH",
          body: JSON.stringify({ releaseTrack: "Archived" }),
          headers: {
            "Content-Type": "application/json",
            cookie: "next-auth.session-token=test-token",
          },
        },
      );

      const response = await executeHandler(
        updateReleaseVersionTrack,
        request,
        { releaseId },
      );
      const payload = await parseJsonObject(response);

      expect(response.status).toBe(404);
      expect(payload).toMatchObject({
        code: "NOT_FOUND",
        message: expect.stringContaining("not found"),
      });
      expect(
        (mockDb.releaseVersion as { update: jest.Mock }).update,
      ).not.toHaveBeenCalled();
    });

    it("rejects an unknown release track value", async () => {
      authMock.mockResolvedValue(authenticatedSession);
      const releaseId = "018f1a50-0000-7000-8000-000000002555";
      setReleaseRecords([
        {
          id: releaseId,
          name: "Release Invalid Track",
          createdAt: new Date("2024-07-03T10:00:00.000Z"),
        },
      ]);

      const request = new NextRequest(
        `http://test/api/v1/release-versions/${releaseId}/track`,
        {
          method: "PATCH",
          body: JSON.stringify({ releaseTrack: "UnknownStatus" }),
          headers: {
            "Content-Type": "application/json",
            cookie: "next-auth.session-token=test-token",
          },
        },
      );

      const response = await executeHandler(
        updateReleaseVersionTrack,
        request,
        { releaseId },
      );
      const payload = await parseJsonObject(response);

      expect(response.status).toBe(400);
      expect(payload).toMatchObject({
        code: "VALIDATION_ERROR",
        message: "Invalid request payload",
      });
      expect(
        (mockDb.releaseVersion as { update: jest.Mock }).update,
      ).not.toHaveBeenCalled();
    });

    it("succeeds without updating when the track is unchanged", async () => {
      authMock.mockResolvedValue(authenticatedSession);
      const releaseId = "018f1a50-0000-7000-8000-000000002666";
      setReleaseRecords([
        {
          id: releaseId,
          name: "Release Same Track",
          releaseTrack: "Active",
          createdAt: new Date("2024-07-04T10:00:00.000Z"),
        },
      ]);

      const request = new NextRequest(
        `http://test/api/v1/release-versions/${releaseId}/track`,
        {
          method: "PATCH",
          body: JSON.stringify({ releaseTrack: "Active" }),
          headers: {
            "Content-Type": "application/json",
            cookie: "next-auth.session-token=test-token",
          },
        },
      );

      const response = await executeHandler(
        updateReleaseVersionTrack,
        request,
        { releaseId },
      );
      const payload = await parseJsonObject(response);

      expect(response.status).toBe(200);
      expect(payload).toMatchObject({
        id: releaseId,
        releaseTrack: "Active",
      });
      expect(
        (mockDb.releaseVersion as { update: jest.Mock }).update,
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
          patches: [
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
      expect(parsed).not.toHaveProperty("patches");
      expect(parsed).not.toHaveProperty("creater");
    });

    it("returns release details with relations when requested", async () => {
      authMock.mockResolvedValue(authenticatedSession);
      const releaseId = "018f1a50-0000-7000-8000-0000000000bb";
      const patchId = "018f1a50-0000-7000-9000-0000000000bc";
      setReleaseRecords([
        {
          id: releaseId,
          name: "Release Detail Relations",
          releaseTrack: "Active",
          createdAt: new Date("2024-05-12T08:00:00.000Z"),
          createdBy: {
            id: USER_3_ID,
            name: "Owner",
            email: "owner@example.com",
          },
          patches: [
            {
              id: patchId,
              name: "Release Detail Relations.0",
              versionId: releaseId,
              createdAt: new Date("2024-05-13T08:00:00.000Z"),
              currentStatus: "active",
              componentVersions: [
                {
                  id: COMPONENT_VERSION_ID_2,
                  releaseComponentId: COMPONENT_A_ID,
                  patchId: patchId,
                  name: "component-b",
                  increment: 1,
                  createdAt: new Date("2024-05-13T09:00:00.000Z"),
                },
              ],
              transitions: [
                {
                  id: TRANSITION_ID_2,
                  patchId: patchId,
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
        `http://test/api/v1/release-versions/${releaseId}?relations=creater&relations=patches&relations=patches.deployedComponents&relations=patches.transitions`,
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
      expect(parsed.patches?.[0]).toMatchObject({
        id: patchId,
        deployedComponents: [expect.objectContaining({ increment: 1 })],
        transitions: [expect.objectContaining({ action: "markActive" })],
      });
      const findUniqueCalls = (
        mockDb.releaseVersion as { findUnique: jest.Mock }
      ).findUnique.mock.calls as Array<[Record<string, unknown>]>;
      const args = findUniqueCalls.at(-1)?.[0] ?? {};
      const include = (
        args as {
          include?: {
            patches?: { select?: Record<string, unknown> };
          };
        }
      ).include;
      expect(include?.patches?.select?.componentVersions).toBeDefined();
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
