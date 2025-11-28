import {
  ReleaseVersionDetailSchema,
  ReleaseVersionIdParamSchema,
  ReleaseVersionListQueryDocSchema,
  ReleaseVersionListQuerySchema,
  ReleaseVersionListResponseSchema,
  ReleaseVersionRelationsQueryDocSchema,
  ReleaseVersionWithRelationsSchema,
  releaseVersionPaths,
} from "~/server/rest/controllers/release-versions.controller";
import {
  ReleaseVersionDtoSchema,
  ReleaseVersionIdSchema,
} from "~/server/zod/dto/release-version.dto";

const SAMPLE_UUID_A = "018f1a50-0000-7000-9000-000000001111";
const SAMPLE_UUID_B = "018f1a50-0000-7000-9000-000000001112";
const SAMPLE_UUID_C = "018f1a50-0000-7000-9000-000000001113";

describe("ReleaseVersion REST contract", () => {
  it("reuses the exported ID schema across DTO and params", () => {
    const value = SAMPLE_UUID_A;
    const dtoParsed = ReleaseVersionDtoSchema.shape.id.parse(value);
    const idParsed = ReleaseVersionIdSchema.parse(value);
    const paramParsed = ReleaseVersionIdParamSchema.parse({ releaseId: value });

    expect(dtoParsed).toBe(idParsed);
    expect(paramParsed.releaseId).toBe(idParsed);
  });

  it("list query schema supports pagination and documented enums", () => {
    const parsed = ReleaseVersionListQuerySchema.parse({
      page: 2,
      pageSize: 25,
      sortBy: "createdAt",
    });
    expect(parsed).toMatchObject({
      page: 2,
      pageSize: 25,
      sortBy: "createdAt",
    });

    const docParsed = ReleaseVersionListQueryDocSchema.safeParse({
      page: 3,
      pageSize: 5,
      sortBy: "createdAt",
    });
    expect(docParsed.success).toBe(true);

    const relationsDoc = ReleaseVersionRelationsQueryDocSchema.safeParse({
      relations: ["creater"],
    });
    expect(relationsDoc.success).toBe(true);
  });

  it("list response schema aliases the DTO-with-relations schema", () => {
    const sample = {
      data: [
        {
          id: SAMPLE_UUID_A,
          name: "Release A",
          releaseTrack: "Future",
          createdAt: "2024-01-01T00:00:00.000Z",
          creater: {
            id: SAMPLE_UUID_B,
            name: "Owner",
            email: "owner@example.com",
          },
          patches: [
            {
              id: SAMPLE_UUID_B,
              name: "Release A.0",
              versionId: SAMPLE_UUID_A,
              createdAt: "2024-01-02T00:00:00.000Z",
              currentStatus: "in_development",
              deployedComponents: [
                {
                  id: SAMPLE_UUID_C,
                  releaseComponentId: SAMPLE_UUID_B,
                  patchId: SAMPLE_UUID_B,
                  name: "component-a",
                  increment: 0,
                  createdAt: "2024-01-02T00:00:00.000Z",
                },
              ],
              transitions: [
                {
                  id: SAMPLE_UUID_C,
                  patchId: SAMPLE_UUID_B,
                  fromStatus: "in_development",
                  toStatus: "in_deployment",
                  action: "startDeployment",
                  createdAt: "2024-01-02T01:00:00.000Z",
                  createdById: SAMPLE_UUID_B,
                },
              ],
            },
          ],
        },
      ],
      pagination: {
        page: 1,
        pageSize: 1,
        totalItems: 1,
        hasNextPage: false,
      },
    };

    expect(() => ReleaseVersionListResponseSchema.parse(sample)).not.toThrow();
  });

  it("detail schema is aligned with the relations schema", () => {
    const sample = {
      id: SAMPLE_UUID_A,
      name: "Detail",
      releaseTrack: "Beta",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    expect(() => ReleaseVersionDetailSchema.parse(sample)).not.toThrow();
    expect(() => ReleaseVersionWithRelationsSchema.parse(sample)).not.toThrow();
    expect(ReleaseVersionDetailSchema).toBe(ReleaseVersionWithRelationsSchema);
  });

  it("OpenAPI paths reference the exported schemas", () => {
    const listPath =
      releaseVersionPaths["/release-versions"]?.get ?? ({} as never);
    const detailPath =
      releaseVersionPaths["/release-versions/{releaseId}"]?.get ??
      ({} as never);

    const listSchema =
      listPath.responses?.[200]?.content?.["application/json"]?.schema;
    const detailSchema =
      detailPath.responses?.[200]?.content?.["application/json"]?.schema;
    const pathParams = detailPath.requestParams?.path;
    const listQuery = listPath.requestParams?.query;
    const detailQuery = detailPath.requestParams?.query;

    expect(listSchema).toBe(ReleaseVersionListResponseSchema);
    expect(detailSchema).toBe(ReleaseVersionDetailSchema);
    expect(pathParams).toBe(ReleaseVersionIdParamSchema);
    expect(listQuery).toBe(ReleaseVersionListQueryDocSchema);
    expect(detailQuery).toBe(ReleaseVersionRelationsQueryDocSchema);
  });
});
