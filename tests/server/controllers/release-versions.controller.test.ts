import { listReleaseVersions } from "~/server/rest/controllers/release-versions.controller";
import {
  ReleaseVersionService,
  type ReleaseVersionRow,
} from "~/server/services/release-version.service";
import type { RestContext } from "~/server/rest/context";

describe("release-versions controller DTO parsing", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("listReleaseVersions maps service rows to output DTOs", async () => {
    const releaseId = "018f1a50-0000-7000-8000-000000000aaa";
    const patchId = "018f1a50-0000-7000-8000-000000000aab";
    const transitionId = "018f1a50-0000-7000-8000-000000000aac";
    const userId = "018f1a50-0000-7000-8000-000000000aad";
    const releaseCreatedAt = new Date("2024-12-01T10:00:00Z");
    const patchCreatedAt = new Date("2024-12-02T11:00:00Z");

    const rows: ReleaseVersionRow[] = [
      {
        id: releaseId,
        name: "Release One",
        releaseTrack: "Future",
        createdAt: releaseCreatedAt,
        createdBy: { id: userId, name: "Tester", email: "tester@example.com" },
        patches: [
          {
            id: patchId,
            name: "Release One.0",
            versionId: releaseId,
            createdAt: patchCreatedAt,
            currentStatus: "in_development",
            componentVersions: [],
            PatchTransition: [
              {
                id: transitionId,
                patchId,
                fromStatus: "in_development",
                toStatus: "in_deployment",
                action: "start_deployment",
                createdAt: patchCreatedAt,
                createdById: userId,
              },
            ],
          },
        ],
      },
    ];

    jest.spyOn(ReleaseVersionService.prototype, "list").mockResolvedValue({
      data: rows,
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: 1,
        hasNextPage: false,
      },
    });

    const context = {
      db: {} as unknown as ConstructorParameters<
        typeof ReleaseVersionService
      >[0],
      session: { user: { id: userId } },
    } as RestContext;

    const result = await listReleaseVersions(
      context,
      { page: 1, pageSize: 10, sortBy: "createdAt" },
      ["creater", "patches", "patches.transitions"],
    );

    expect(result.data[0]).toMatchObject({
      id: releaseId,
      name: "Release One",
      releaseTrack: "Future",
      createdAt: releaseCreatedAt.toISOString(),
      creater: {
        id: userId,
        name: "Tester",
        email: "tester@example.com",
      },
    });
    expect(result.data[0]?.patches?.[0]).toMatchObject({
      id: patchId,
      transitions: [
        {
          id: transitionId,
          action: "startDeployment",
          createdAt: patchCreatedAt.toISOString(),
        },
      ],
    });
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 10,
      totalItems: 1,
      hasNextPage: false,
    });
  });
});
