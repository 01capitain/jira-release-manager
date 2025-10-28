import {
  getJiraCredentials,
  saveJiraCredentials,
} from "~/server/rest/controllers/jira-setup.controller";
import {
  createRestHandler,
  jsonResponse,
  parseJsonBody,
} from "~/server/rest/handler";
import { JiraCredentialsSchema } from "~/server/api/schemas";

export const GET = createRestHandler(async ({ context }) => {
  const data = await getJiraCredentials(context);
  return jsonResponse(data);
});

export const POST = createRestHandler(async ({ context, req }) => {
  const payload = await parseJsonBody(req, JiraCredentialsSchema);
  const result = await saveJiraCredentials(context, payload);
  return jsonResponse(result);
});
