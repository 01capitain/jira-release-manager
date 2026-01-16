import {
  PatchTransitionParamSchema,
  markActivePreflight,
  markActivePatch,
} from "~/server/rest/controllers/patch-transitions.controller";
import { createRestHandler, jsonResponse } from "~/server/rest/handler";

export const GET = createRestHandler(async ({ context, params }) => {
  const parsedParams = PatchTransitionParamSchema.parse(params);
  const result = await markActivePreflight(context, parsedParams);
  return jsonResponse(result);
});

export const POST = createRestHandler(async ({ context, params }) => {
  const parsedParams = PatchTransitionParamSchema.parse(params);
  const result = await markActivePatch(context, parsedParams);
  return jsonResponse(result);
});
