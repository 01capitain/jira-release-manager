import {
  BuiltVersionIdParamSchema,
  getBuiltVersionDefaultSelection,
} from "~/server/rest/controllers/built-versions.controller";
import { createRestHandler, jsonResponse } from "~/server/rest/handler";

export const GET = createRestHandler(async ({ params, context }) => {
  const { builtId } = BuiltVersionIdParamSchema.parse(params);
  const data = await getBuiltVersionDefaultSelection(context, builtId);
  return jsonResponse(data);
});
