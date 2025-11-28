import { getReleaseVersionDefaults } from "~/server/rest/controllers/release-versions.controller";
import { createRestHandler, jsonResponse } from "~/server/rest/handler";

export const GET = createRestHandler(async ({ context }) => {
  const data = await getReleaseVersionDefaults(context);
  return jsonResponse(data);
});
