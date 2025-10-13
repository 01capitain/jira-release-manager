import {
  JiraSyncVersionsInputSchema,
  syncJiraVersions,
} from "~/server/rest/controllers/jira-releases.controller";
import {
  createRestHandler,
  jsonResponse,
  parseJsonBody,
} from "~/server/rest/handler";

export const POST = createRestHandler(async ({ req, context }) => {
  const payload = await parseJsonBody(req, JiraSyncVersionsInputSchema);
  const result = await syncJiraVersions(context, payload);
  return jsonResponse(result);
});
