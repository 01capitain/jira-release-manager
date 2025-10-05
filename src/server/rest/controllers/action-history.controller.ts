import { z } from "zod";

import { ActionHistoryService } from "~/server/services/action-history.service";
import { ActionHistoryEntryDtoSchema } from "~/server/zod/dto/action-history.dto";
import type { RestContext } from "~/server/rest/context";
import { ensureAuthenticated } from "~/server/rest/auth";
import { jsonErrorResponse } from "~/server/rest/openapi";

export const ActionHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  cursor: z.string().uuid().optional(),
});

export type ActionHistoryQuery = z.infer<typeof ActionHistoryQuerySchema>;

export const ActionHistoryListResponseSchema = z.object({
  items: z.array(ActionHistoryEntryDtoSchema),
  nextCursor: z.string().uuid().nullable(),
  hasMore: z.boolean(),
});

export const listActionHistory = async (
  context: RestContext,
  query: ActionHistoryQuery,
) => {
  const svc = new ActionHistoryService(context.db);
  const userId = ensureAuthenticated(context);
  const limit = query.limit ?? 50;
  const cursor = query.cursor ?? null;
  const sessionToken = context.sessionToken ?? null;
  return svc.listBySession(sessionToken, userId, limit, cursor);
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
        401: jsonErrorResponse("Authentication required"),
      },
    },
  },
} as const;
