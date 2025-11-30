import { z } from "zod";

import {
  DEFAULT_RELEASE_VERSION_LIST_INPUT,
  RELEASE_VERSION_SORT_FIELDS,
} from "~/server/api/schemas";
import { ensureAuthenticated } from "~/server/rest/auth";
import type { RestContext } from "~/server/rest/context";
import { RestError } from "~/server/rest/errors";
import { jsonErrorResponse } from "~/server/rest/openapi";
import { ActionHistoryService } from "~/server/services/action-history.service";
import { ReleaseVersionDefaultsService } from "~/server/services/release-version-defaults.service";
import { ReleaseVersionService } from "~/server/services/release-version.service";
import { PatchDtoSchema } from "~/server/zod/dto/patch.dto";
import { PatchTransitionDtoSchema } from "~/server/zod/dto/patch-transition.dto";
import { ComponentVersionDtoSchema } from "~/server/zod/dto/component-version.dto";
import {
  ReleaseVersionDefaultsDtoSchema,
  ReleaseVersionDtoSchema,
} from "~/server/zod/dto/release-version.dto";
import { UserSummaryDtoSchema } from "~/server/zod/dto/user.dto";
import {
  createPaginatedQueryDocSchema,
  createPaginatedRequestSchema,
  createPaginatedResponseSchema,
} from "~/shared/schemas/pagination";
import {
  ReleaseVersionCreateSchema,
  ReleaseVersionUpdateSchema,
} from "~/shared/schemas/release-version";
import type { ReleaseVersionRelationKey } from "~/shared/types/release-version-relations";
import {
  RELEASE_VERSION_RELATION_ALLOW_LIST,
  validateReleaseVersionRelations,
} from "~/server/services/release-version.relations";

export {
  ReleaseVersionCreateSchema,
  ReleaseVersionUpdateSchema,
} from "~/shared/schemas/release-version";

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

const RELEASE_VERSION_SORT_DOC_VALUES = [
  ...RELEASE_VERSION_SORT_FIELDS,
  ...RELEASE_VERSION_SORT_FIELDS.map((field) => `-${field}` as const),
] as const;

const ReleaseVersionRelationsDocSchema = z.object({
  relations: z
    .array(
      z.enum(
        RELEASE_VERSION_RELATION_ALLOW_LIST as [
          ReleaseVersionRelationKey,
          ...ReleaseVersionRelationKey[],
        ],
      ),
    )
    .describe("Relations to include in the response")
    .optional(),
});

export const ReleaseVersionRelationsQueryDocSchema =
  ReleaseVersionRelationsDocSchema;

export const ReleaseVersionListQueryDocSchema = createPaginatedQueryDocSchema(
  z.enum(RELEASE_VERSION_SORT_DOC_VALUES),
).merge(ReleaseVersionRelationsDocSchema);

const ReleaseVersionPatchWithRelationsSchema = PatchDtoSchema.extend({
  deployedComponents: z.array(ComponentVersionDtoSchema).optional(),
  transitions: z.array(PatchTransitionDtoSchema).optional(),
});

export const ReleaseVersionWithRelationsSchema = ReleaseVersionDtoSchema.extend(
  {
    creater: UserSummaryDtoSchema.optional(),
    patches: z.array(ReleaseVersionPatchWithRelationsSchema).optional(),
  },
);

export const ReleaseVersionListResponseSchema = createPaginatedResponseSchema(
  ReleaseVersionWithRelationsSchema,
);

export const ReleaseVersionDetailSchema = ReleaseVersionWithRelationsSchema;

export const ReleaseVersionIdParamSchema = z.object({
  releaseId: z.uuidv7(),
});

export const ReleaseVersionCreateResponseSchema = ReleaseVersionDtoSchema;

const releaseVersionDefaultsService = new ReleaseVersionDefaultsService();

export const parseReleaseVersionRelations = (
  searchParams: URLSearchParams,
): ReleaseVersionRelationKey[] => {
  const requested = searchParams.getAll("relations");
  if (requested.length === 0) {
    return [];
  }
  const { valid, invalid, missingParents } =
    validateReleaseVersionRelations(requested);
  if (invalid.length > 0 || missingParents.length > 0) {
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
      details,
    );
  }
  return valid;
};

export const listReleaseVersions = async (
  context: RestContext,
  query: ReleaseVersionListQuery,
  relations: ReleaseVersionRelationKey[] = [],
) => {
  ensureAuthenticated(context);
  const svc = new ReleaseVersionService(context.db);
  const options =
    relations.length > 0 ? { relations: [...relations] } : undefined;
  return svc.list(query, options);
};

export const getReleaseVersion = async (
  context: RestContext,
  releaseId: string,
  relations: ReleaseVersionRelationKey[] = [],
) => {
  ensureAuthenticated(context);
  const svc = new ReleaseVersionService(context.db);
  const options =
    relations.length > 0 ? { relations: [...relations] } : undefined;
  return svc.getById(releaseId, options);
};

export const createReleaseVersion = async (
  context: RestContext,
  input: z.infer<typeof ReleaseVersionCreateSchema>,
) => {
  const userId = ensureAuthenticated(context);
  const svc = new ReleaseVersionService(context.db);
  const history = new ActionHistoryService(context.db);
  const action = await history.startAction({
    actionType: "releaseVersion.create",
    message: `Create release ${input.name?.trim() ?? "(auto)"}`,
    userId,
    sessionToken: context.sessionToken ?? null,
  });
  try {
    const result = await svc.create(userId, input, { logger: action });
    await action.complete("success", {
      message: `Release ${result.name} created`,
      metadata: { id: result.id },
    });
    return result;
  } catch (error: unknown) {
    await action.complete("failed", {
      message: `Failed to create release ${input.name ?? "(auto)"}`,
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
};

export const getReleaseVersionDefaults = async (context: RestContext) => {
  ensureAuthenticated(context);
  const svc = new ReleaseVersionService(context.db);
  return releaseVersionDefaultsService.calculateDefaultsForLatest(svc);
};

export const updateReleaseVersion = async (
  context: RestContext,
  releaseId: string,
  input: z.infer<typeof ReleaseVersionUpdateSchema>,
) => {
  const userId = ensureAuthenticated(context);
  const svc = new ReleaseVersionService(context.db);
  const history = new ActionHistoryService(context.db);
  const action = await history.startAction({
    actionType: "releaseVersion.update",
    message: `Update release ${releaseId}`,
    userId,
    sessionToken: context.sessionToken ?? null,
    metadata: {
      releaseId,
      releaseTrack: input.releaseTrack,
      name: input.name,
    },
  });
  try {
    const result = await svc.updateRelease(releaseId, input, userId, {
      logger: action,
    });
    await action.complete("success", {
      message: `Release ${result.name} updated`,
      metadata: {
        releaseId,
        name: result.name,
        releaseTrack: result.releaseTrack,
      },
    });
    return result;
  } catch (error) {
    await action.complete("failed", {
      message: `Failed to update release ${releaseId}`,
      metadata: {
        releaseId,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
};

export const releaseVersionPaths = {
  "/release-versions/new-values": {
    get: {
      operationId: "getReleaseVersionDefaults",
      summary: "Get default release version values",
      tags: ["Release Versions"],
      responses: {
        200: {
          description: "Default values for new release version",
          content: {
            "application/json": {
              schema: ReleaseVersionDefaultsDtoSchema,
            },
          },
        },
        401: jsonErrorResponse("Authentication required"),
      },
    },
  },
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
        400: jsonErrorResponse("Invalid query parameters"),
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
        404: jsonErrorResponse("Release not found"),
      },
    },
    patch: {
      operationId: "updateReleaseVersion",
      summary: "Update release version",
      tags: ["Release Versions"],
      requestParams: {
        path: ReleaseVersionIdParamSchema,
      },
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: ReleaseVersionUpdateSchema,
          },
        },
      },
      responses: {
        200: {
          description: "Release version updated",
          content: {
            "application/json": {
              schema: ReleaseVersionDtoSchema,
            },
          },
        },
        400: jsonErrorResponse("Validation error"),
        401: jsonErrorResponse("Authentication required"),
        404: jsonErrorResponse("Release not found"),
        409: jsonErrorResponse("Release already exists"),
      },
    },
  },
} as const;
