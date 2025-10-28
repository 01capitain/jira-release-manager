import { getJiraConfig } from "~/server/rest/controllers/jira-setup.controller";
import { createRestHandler, jsonResponse } from "~/server/rest/handler";

export const GET = createRestHandler(async () => {
  const data = await getJiraConfig();
  return jsonResponse(data);
});
