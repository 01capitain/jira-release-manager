import {
  BuiltVersionTransitionBodySchema,
  BuiltVersionTransitionParamSchema,
  transitionBuiltVersion,
} from "~/server/rest/controllers/built-version-transitions.controller";
import {
  createRestHandler,
  jsonResponse,
  parseJsonBody,
} from "~/server/rest/handler";

export const POST = createRestHandler(async ({ context, params, req }) => {
  const parsedParams = BuiltVersionTransitionParamSchema.parse(params);
  const body = await parseJsonBody(req, BuiltVersionTransitionBodySchema);
  const result = await transitionBuiltVersion(context, parsedParams, body);
  return jsonResponse(result);
});
