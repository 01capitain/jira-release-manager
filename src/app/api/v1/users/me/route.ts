import { getCurrentUser } from "~/server/rest/controllers/users.controller";
import { createRestHandler, jsonResponse } from "~/server/rest/handler";

export const GET = createRestHandler(async ({ context }) => {
  const profile = getCurrentUser(context);
  return jsonResponse(profile);
});
