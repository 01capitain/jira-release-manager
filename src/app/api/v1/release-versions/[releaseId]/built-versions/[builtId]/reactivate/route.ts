import {
  BuiltVersionTransitionParamSchema,
  reactivateBuiltVersion,
} from "~/server/rest/controllers/built-version-transitions.controller";
import { createRestHandler, jsonResponse } from "~/server/rest/handler";

export const POST = createRestHandler(async ({ context, params }) => {
  const parsedParams = BuiltVersionTransitionParamSchema.parse(params);
  const result = await reactivateBuiltVersion(context, parsedParams);
  return jsonResponse(result);
});
