import { z } from "zod";

import { ActionHistoryService } from "~/server/services/action-history.service";
import { ReleaseComponentService } from "~/server/services/release-component.service";
import { ReleaseComponentDtoSchema } from "~/server/zod/dto/release-component.dto";
import type { RestContext } from "~/server/rest/context";
import { ensureAuthenticated } from "~/server/rest/auth";
import { jsonErrorResponse } from "~/server/rest/openapi";
import { ReleaseComponentCreateSchema } from "~/shared/schemas/release-component";

export const ReleaseComponentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().min(1).optional(),
  releaseId: z.string().uuid().optional(),
});

export type ReleaseComponentListQuery = z.infer<
  typeof ReleaseComponentListQuerySchema
>;

export const ReleaseComponentListResponseSchema = z.object({
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  items: z.array(ReleaseComponentDtoSchema),
});

export const ReleaseComponentIdParamSchema = z.object({
  componentId: z.string().uuid(),
});

export const listReleaseComponents = async (
  context: RestContext,
  query: ReleaseComponentListQuery,
) => {
  const svc = new ReleaseComponentService(context.db);
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 9;
  const search = query.search?.trim();
  const result = await svc.paginate(page, pageSize, {
    search: search && search.length > 0 ? search : undefined,
    releaseId: query.releaseId,
  });
  return {
    total: result.total,
    page,
    pageSize,
    items: result.items,
  } satisfies z.infer<typeof ReleaseComponentListResponseSchema>;
};

export const getReleaseComponent = async (
  context: RestContext,
  componentId: string,
) => {
  const svc = new ReleaseComponentService(context.db);
  return svc.getById(componentId);
};

export const createReleaseComponent = async (
  context: RestContext,
  input: z.infer<typeof ReleaseComponentCreateSchema>,
) => {
  const svc = new ReleaseComponentService(context.db);
  const userId = ensureAuthenticated(context);
  const history = new ActionHistoryService(context.db);
  const trimmedName = input.name.trim();
  const action = await history.startAction({
    actionType: "releaseComponent.create",
    message: `Create release component ${trimmedName}`,
    userId,
    sessionToken: context.sessionToken ?? null,
    metadata: { color: input.color },
  });
  try {
    const result = await svc.create(userId, input, { logger: action });
    await action.complete("success", {
      message: `Release component ${result.name} created`,
      metadata: { id: result.id },
    });
    return result;
  } catch (error: unknown) {
    await action.complete("failed", {
      message: `Failed to create release component ${trimmedName}`,
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
};

export const releaseComponentPaths = {
  "/release-components": {
    get: {
      operationId: "listReleaseComponents",
      summary: "List release components",
      tags: ["Release Components"],
      requestParams: {
        query: ReleaseComponentListQuerySchema,
      },
      responses: {
        200: {
          description: "Release components page",
          content: {
            "application/json": {
              schema: ReleaseComponentListResponseSchema,
            },
          },
        },
        400: jsonErrorResponse("Invalid query parameters"),
      },
    },
    post: {
      operationId: "createReleaseComponent",
      summary: "Create release component",
      tags: ["Release Components"],
      requestBody: {
        content: {
          "application/json": {
            schema: ReleaseComponentCreateSchema,
          },
        },
        required: true,
      },
      responses: {
        201: {
          description: "Release component created",
          content: {
            "application/json": {
              schema: ReleaseComponentDtoSchema,
            },
          },
        },
        400: jsonErrorResponse("Validation error"),
        401: jsonErrorResponse("Authentication required"),
        409: jsonErrorResponse("Component already exists"),
      },
    },
  },
  "/release-components/{componentId}": {
    get: {
      operationId: "getReleaseComponent",
      summary: "Get release component",
      tags: ["Release Components"],
      requestParams: {
        path: ReleaseComponentIdParamSchema,
      },
      responses: {
        200: {
          description: "Release component",
          content: {
            "application/json": {
              schema: ReleaseComponentDtoSchema,
            },
          },
        },
        404: jsonErrorResponse("Component not found"),
      },
    },
  },
} as const;
