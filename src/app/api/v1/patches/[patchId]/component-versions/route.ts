import {
  ComponentVersionByPatchParamsSchema,
  listComponentVersionsByPatch,
} from "~/server/rest/controllers/component-versions.controller";
import { createRestHandler, jsonResponse } from "~/server/rest/handler";

export const GET = createRestHandler(async ({ params, context }) => {
  const { patchId } = ComponentVersionByPatchParamsSchema.parse(params);
  const data = await listComponentVersionsByPatch(context, patchId);
  return jsonResponse(data);
});
