import {
  JiraStoredVersionsQuerySchema,
  listStoredJiraVersions,
} from "~/server/rest/controllers/jira-releases.controller";
import {
  createRestHandler,
  jsonResponse,
  parseSearchParams,
} from "~/server/rest/handler";

export const GET = createRestHandler(async ({ req, context }) => {
  const query = parseSearchParams(req, JiraStoredVersionsQuerySchema);
  const data = await listStoredJiraVersions(context, query);
  return jsonResponse(data);
});
