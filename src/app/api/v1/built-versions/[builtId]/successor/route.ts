import {
  BuiltVersionIdParamSchema,
  BuiltVersionSuccessorResponseSchema,
  createSuccessor,
} from "~/server/rest/controllers/built-versions.controller";
import {
  createRestHandler,
  jsonResponse,
  parseJsonBody,
} from "~/server/rest/handler";
import { BuiltVersionCreateSuccessorInputSchema } from "~/server/api/schemas";
import { RestError } from "~/server/rest/errors";

export const POST = createRestHandler(async ({ params, context, req }) => {
  const { builtId } = BuiltVersionIdParamSchema.parse(params);
  const input = await parseJsonBody(
    req,
    BuiltVersionCreateSuccessorInputSchema,
  );
  if (input.builtVersionId !== builtId) {
    throw new RestError(400, "VALIDATION_ERROR", "Built version id mismatch", {
      pathBuiltId: builtId,
      payloadBuiltId: input.builtVersionId,
    });
  }
  const result = await createSuccessor(context, input);
  return jsonResponse(BuiltVersionSuccessorResponseSchema.parse(result));
});
