import {
  ComponentVersionByBuiltParamsSchema,
  listComponentVersionsByBuilt,
} from "~/server/rest/controllers/component-versions.controller";
import { createRestHandler, jsonResponse } from "~/server/rest/handler";

export const GET = createRestHandler(async ({ params, context }) => {
  const { builtId } = ComponentVersionByBuiltParamsSchema.parse(params);
  const data = await listComponentVersionsByBuilt(context, builtId);
  return jsonResponse(data);
});
