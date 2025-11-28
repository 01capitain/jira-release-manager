import {
  PatchIdParamSchema,
  getPatchDefaultSelection,
} from "~/server/rest/controllers/patches.controller";
import { createRestHandler, jsonResponse } from "~/server/rest/handler";

export const GET = createRestHandler(async ({ params, context }) => {
  const { patchId } = PatchIdParamSchema.parse(params);
  const data = await getPatchDefaultSelection(context, patchId);
  return jsonResponse(data);
});
