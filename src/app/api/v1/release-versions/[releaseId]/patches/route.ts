import {
  listPatches,
  ReleasePatchesParamsSchema,
} from "~/server/rest/controllers/patches.controller";
import { createRestHandler, jsonResponse } from "~/server/rest/handler";

export const GET = createRestHandler(async ({ params, context }) => {
  const { releaseId } = ReleasePatchesParamsSchema.parse(params);
  const data = await listPatches(context, releaseId);
  return jsonResponse(data);
});
