import { z } from "zod";

import { ActionHistoryService } from "~/server/services/action-history.service";
import { ReleaseVersionService } from "~/server/services/release-version.service";
import {
  RELEASE_VERSION_TOP_LEVEL_RELATIONS,
  validateReleaseVersionRelations,
} from "~/server/services/release-version.relations";
import { collectRelationParams } from "~/server/rest/relations";
import { BuiltVersionDtoSchema } from "~/server/zod/dto/built-version.dto";
import { BuiltVersionTransitionDtoSchema } from "~/server/zod/dto/built-version-transition.dto";
import { ComponentVersionDtoSchema } from "~/server/zod/dto/component-version.dto";
import {
  ReleaseVersionDtoSchema,
  ReleaseVersionIdSchema,
} from "~/server/zod/dto/release-version.dto";
import { UserSummaryDtoSchema } from "~/server/zod/dto/user.dto";
import type { RestContext } from "~/server/rest/context";
import { ensureAuthenticated } from "~/server/rest/auth";
import { RestError } from "~/server/rest/errors";
import { jsonErrorResponse } from "~/server/rest/openapi";
import {
  DEFAULT_RELEASE_VERSION_LIST_INPUT,
  RELEASE_VERSION_SORT_FIELDS,
} from "~/server/api/schemas";
import type { ReleaseVersionRelationKey } from "~/shared/types/release-version-relations";
import {
  createPaginatedQueryDocSchema,
  createPaginatedRequestSchema,
  createPaginatedResponseSchema,
} from "~/shared/schemas/pagination";
import { ReleaseVersionCreateSchema } from "~/shared/schemas/release-version";

export { ReleaseVersionCreateSchema } from "~/shared/schemas/release-version";

export const ReleaseVersionListQuerySchema = createPaginatedRequestSchema(
  RELEASE_VERSION_SORT_FIELDS,
  {
    defaultPage: DEFAULT_RELEASE_VERSION_LIST_INPUT.page,
    defaultPageSize: DEFAULT_RELEASE_VERSION_LIST_INPUT.pageSize,
    defaultSortBy: DEFAULT_RELEASE_VERSION_LIST_INPUT.sortBy,
    maxPageSize: 100,
  },
);

export type ReleaseVersionListQuery = z.infer<
  typeof ReleaseVersionListQuerySchema
>;

const ReleaseVersionTopLevelRelationEnum = z.enum(
  RELEASE_VERSION_TOP_LEVEL_RELATIONS,
);

const ReleaseVersionRelationsDocSchema = z.object({
  relations: z
    .array(ReleaseVersionTopLevelRelationEnum)
    .optional()
    .describe(
      [
        "Optional relation keys to include in the response.",
        "Repeat the query param or pass a comma-separated string.",
        "Nested options (builtVersions.deployedComponents, builtVersions.transitions)",
        "must be accompanied by their parent relation.",
      ].join(" "),
    ),
});

const BuiltVersionWithRelationsSchema = BuiltVersionDtoSchema.extend({
  deployedComponents: z.array(ComponentVersionDtoSchema).optional(),
  transitions: z.array(BuiltVersionTransitionDtoSchema).optional(),
}).meta({
  id: "BuiltVersionWithRelations",
  title: "Built Version (with relations)",
  description:
    "Built version data with optional deployed components and transitions.",
});

const ReleaseVersionRelationsSchema = z.object({
  creater: UserSummaryDtoSchema.optional(),
  builtVersions: z.array(BuiltVersionWithRelationsSchema).optional(),
});

export const ReleaseVersionWithRelationsSchema = ReleaseVersionDtoSchema.and(
  ReleaseVersionRelationsSchema,
).meta({
  id: "ReleaseVersionWithRelations",
  title: "Release Version (with relations)",
  description:
    "Release version data including optional creator and built version relations.",
});

export const ReleaseVersionListResponseSchema = createPaginatedResponseSchema(
  ReleaseVersionWithRelationsSchema,
).meta({
  id: "ReleaseVersionListResponse",
  title: "Release Version List Response",
  description: "Paginated release version list response.",
});

export const ReleaseVersionDetailSchema = ReleaseVersionWithRelationsSchema;

export const ReleaseVersionIdParamSchema = z.object({
  releaseId: ReleaseVersionIdSchema,
});

export const ReleaseVersionCreateResponseSchema = ReleaseVersionDtoSchema;

const ReleaseVersionSortOptions = [
  ...RELEASE_VERSION_SORT_FIELDS,
  ...RELEASE_VERSION_SORT_FIELDS.map((field) => `-${field}` as const),
] as const;

const ReleaseVersionSortEnum = z.enum([...ReleaseVersionSortOptions]);

export const ReleaseVersionListQueryDocSchema = createPaginatedQueryDocSchema(
  ReleaseVersionSortEnum,
).merge(ReleaseVersionRelationsDocSchema);

export const ReleaseVersionRelationsQueryDocSchema =
  ReleaseVersionRelationsDocSchema;

export const parseReleaseVersionRelations = (
  searchParams: URLSearchParams,
): ReleaseVersionRelationKey[] => {
  const requested = collectRelationParams(searchParams);
  const { valid, invalid, missingParents } =
    validateReleaseVersionRelations(requested);
  if (invalid.length === 0 && missingParents.length === 0) {
    return valid;
  }
  const details: Record<string, unknown> = {};
  if (invalid.length > 0) {
    details.invalidRelations = invalid;
  }
  if (missingParents.length > 0) {
    details.missingParentRelations = missingParents;
  }
  throw new RestError(
    400,
    "INVALID_RELATION",
    "Invalid relations requested",
    Object.keys(details).length > 0 ? details : undefined,
  );
};

export const listReleaseVersions = async (
  context: RestContext,
  query: ReleaseVersionListQuery,
  relations: ReleaseVersionRelationKey[] = [],
) => {
  ensureAuthenticated(context);
  const svc = new ReleaseVersionService(context.db);
  return svc.list(query, { relations });
};

export const getReleaseVersion = async (
  context: RestContext,
  releaseId: string,
  relations: ReleaseVersionRelationKey[] = [],
) => {
  ensureAuthenticated(context);
  const svc = new ReleaseVersionService(context.db);
  return svc.getById(releaseId, { relations });
};

export const createReleaseVersion = async (
  context: RestContext,
  input: z.infer<typeof ReleaseVersionCreateSchema>,
) => {
  const svc = new ReleaseVersionService(context.db);
  const userId = ensureAuthenticated(context);
  const history = new ActionHistoryService(context.db);
  const trimmed = input.name.trim();
  if (!trimmed) {
    throw new RestError(400, "VALIDATION_ERROR", "Name is required");
  }
  const action = await history.startAction({
    actionType: "releaseVersion.create",
    message: `Create release ${trimmed}`,
    userId,
    sessionToken: context.sessionToken ?? null,
  });
  try {
    const result = await svc.create(userId, trimmed, { logger: action });
    await action.complete("success", {
      message: `Release ${result.name} created`,
      metadata: { id: result.id },
    });
    return result;
  } catch (error: unknown) {
    await action.complete("failed", {
      message: `Failed to create release ${trimmed}`,
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
};

export const releaseVersionPaths = {
  "/release-versions": {
    get: {
      operationId: "listReleaseVersions",
      summary: "List release versions",
      tags: ["Release Versions"],
      requestParams: {
        query: ReleaseVersionListQueryDocSchema,
      },
      responses: {
        200: {
          description: "Release versions page",
          content: {
            "application/json": {
              schema: ReleaseVersionListResponseSchema,
            },
          },
        },
        400: jsonErrorResponse("Invalid query parameters or relations"),
      },
    },
    post: {
      operationId: "createReleaseVersion",
      summary: "Create release version",
      tags: ["Release Versions"],
      requestBody: {
        content: {
          "application/json": {
            schema: ReleaseVersionCreateSchema,
          },
        },
        required: true,
      },
      responses: {
        201: {
          description: "Release version created",
          content: {
            "application/json": {
              schema: ReleaseVersionCreateResponseSchema,
            },
          },
        },
        400: jsonErrorResponse("Validation error"),
        401: jsonErrorResponse("Authentication required"),
        409: jsonErrorResponse("Release already exists"),
      },
    },
  },
  "/release-versions/{releaseId}": {
    get: {
      operationId: "getReleaseVersion",
      summary: "Get release version",
      tags: ["Release Versions"],
      requestParams: {
        path: ReleaseVersionIdParamSchema,
        query: ReleaseVersionRelationsQueryDocSchema,
      },
      responses: {
        200: {
          description: "Release version",
          content: {
            "application/json": {
              schema: ReleaseVersionDetailSchema,
            },
          },
        },
        400: jsonErrorResponse("Invalid relations"),
        404: jsonErrorResponse("Release not found"),
      },
    },
  },
} as const;
