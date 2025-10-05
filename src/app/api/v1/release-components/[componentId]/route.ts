import {
  getReleaseComponent,
  ReleaseComponentIdParamSchema,
} from "~/server/rest/controllers/release-components.controller";
import { createRestHandler, jsonResponse } from "~/server/rest/handler";

export const GET = createRestHandler(async ({ context, params }) => {
  const { componentId } = ReleaseComponentIdParamSchema.parse(params);
  const data = await getReleaseComponent(context, componentId);
  return jsonResponse(data);
});
