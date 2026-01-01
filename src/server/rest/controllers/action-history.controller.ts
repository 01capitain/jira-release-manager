import { type z } from "zod";

import { ActionHistoryListInputSchema } from "~/server/api/schemas";
import { ActionHistoryService } from "~/server/services/action-history.service";
import {
  ActionHistoryEntryDtoSchema,
  mapToActionHistoryEntryDtos,
} from "~/server/zod/dto/action-history.dto";
import type { RestContext } from "~/server/rest/context";
import { ensureAuthenticated } from "~/server/rest/auth";
import { jsonErrorResponse } from "~/server/rest/openapi";
import { createPaginatedResponseSchema } from "~/shared/schemas/pagination";

export const ActionHistoryQuerySchema = ActionHistoryListInputSchema;

export type ActionHistoryQuery = z.infer<typeof ActionHistoryListInputSchema>;

export const ActionHistoryListResponseSchema = createPaginatedResponseSchema(
  ActionHistoryEntryDtoSchema,
).meta({
  id: "ActionHistoryListResponse",
  title: "Action History List Response",
  description: "Paginated action history entries for the current session.",
});

export const listActionHistory = async (
  context: RestContext,
  query: ActionHistoryQuery,
) => {
  const svc = new ActionHistoryService(context.db);
  const userId = ensureAuthenticated(context);
  const sessionToken = context.sessionToken ?? null;
  const page = await svc.listBySession(sessionToken, userId, query);
  const data = mapToActionHistoryEntryDtos(page.data);
  return ActionHistoryListResponseSchema.parse({
    data,
    pagination: page.pagination,
  });
};

export const actionHistoryPaths = {
  "/action-history": {
    get: {
      operationId: "listActionHistory",
      summary: "List action history for current session",
      tags: ["Action History"],
      requestParams: {
        query: ActionHistoryQuerySchema,
      },
      responses: {
        200: {
          description: "Action history page",
          content: {
            "application/json": {
              schema: ActionHistoryListResponseSchema,
            },
          },
        },
        400: jsonErrorResponse("Invalid query parameters"),
        401: jsonErrorResponse("Authentication required"),
      },
    },
  },
} as const;
