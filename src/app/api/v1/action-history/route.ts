import {
  ActionHistoryQuerySchema,
  listActionHistory,
} from "~/server/rest/controllers/action-history.controller";
import {
  createRestHandler,
  jsonResponse,
  parseSearchParams,
} from "~/server/rest/handler";

export const GET = createRestHandler(async ({ req, context }) => {
  const query = parseSearchParams(req, ActionHistoryQuerySchema);
  const data = await listActionHistory(context, query);
  return jsonResponse(data);
});
