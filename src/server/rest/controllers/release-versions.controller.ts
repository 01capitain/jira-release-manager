import { z } from "zod";

import { ActionHistoryService } from "~/server/services/action-history.service";
import { ReleaseVersionService } from "~/server/services/release-version.service";
import { BuiltVersionDtoSchema } from "~/server/zod/dto/built-version.dto";
import { ReleaseVersionDtoSchema } from "~/server/zod/dto/release-version.dto";
import type { RestContext } from "~/server/rest/context";
import { ensureAuthenticated } from "~/server/rest/auth";
import { RestError } from "~/server/rest/errors";
import { jsonErrorResponse } from "~/server/rest/openapi";
import { ReleaseVersionCreateSchema } from "~/shared/schemas/release-version";

export const ReleaseVersionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export type ReleaseVersionListQuery = z.infer<
  typeof ReleaseVersionListQuerySchema
>;

export const ReleaseVersionListResponseSchema = z.object({
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  items: z.array(ReleaseVersionDtoSchema),
});

export const ReleaseVersionDetailSchema = ReleaseVersionDtoSchema.extend({
  builtVersions: z.array(BuiltVersionDtoSchema),
});

export const ReleaseVersionIdParamSchema = z.object({
  releaseId: z.string().uuid(),
});

export const ReleaseVersionCreateResponseSchema = ReleaseVersionDtoSchema;

export const listReleaseVersions = async (
  context: RestContext,
  query: ReleaseVersionListQuery,
) => {
  const svc = new ReleaseVersionService(context.db);
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 9;
  const result = await svc.list(page, pageSize);
  return {
    page,
    pageSize,
    total: result.total,
    items: result.items,
  } satisfies z.infer<typeof ReleaseVersionListResponseSchema>;
};

export const getReleaseVersion = async (
  context: RestContext,
  releaseId: string,
) => {
  const svc = new ReleaseVersionService(context.db);
  return svc.getById(releaseId);
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
        query: ReleaseVersionListQuerySchema,
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
  },
} as const;
