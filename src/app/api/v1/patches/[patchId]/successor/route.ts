import {
  PatchIdParamSchema,
  PatchSuccessorResponseSchema,
  createSuccessor,
} from "~/server/rest/controllers/patches.controller";
import {
  createRestHandler,
  jsonResponse,
  parseJsonBody,
} from "~/server/rest/handler";
import { PatchCreateSuccessorInputSchema } from "~/server/api/schemas";
import { RestError } from "~/server/rest/errors";

export const POST = createRestHandler(async ({ params, context, req }) => {
  const { patchId } = PatchIdParamSchema.parse(params);
  const input = await parseJsonBody(
    req,
    PatchCreateSuccessorInputSchema,
  );
  if (input.patchId !== patchId) {
    throw new RestError(400, "VALIDATION_ERROR", "Patch id mismatch", {
      pathPatchId: patchId,
      payloadPatchId: input.patchId,
    });
  }
  const result = await createSuccessor(context, input);
  return jsonResponse(PatchSuccessorResponseSchema.parse(result));
});
