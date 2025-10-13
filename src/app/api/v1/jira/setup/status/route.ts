import { getJiraSetupStatus } from "~/server/rest/controllers/jira-setup.controller";
import { createRestHandler, jsonResponse } from "~/server/rest/handler";

export const GET = createRestHandler(async ({ context }) => {
  const result = await getJiraSetupStatus(context);
  return jsonResponse(result);
});
