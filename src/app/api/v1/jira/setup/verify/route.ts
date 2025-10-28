import { verifyJiraConnection } from "~/server/rest/controllers/jira-setup.controller";
import {
  createRestHandler,
  jsonResponse,
  parseJsonBody,
} from "~/server/rest/handler";
import { JiraVerifyConnectionSchema } from "~/server/api/schemas";

export const POST = createRestHandler(async ({ context, req }) => {
  const payload = await parseJsonBody(req, JiraVerifyConnectionSchema);
  const result = await verifyJiraConnection(context, payload);
  return jsonResponse(result);
});
