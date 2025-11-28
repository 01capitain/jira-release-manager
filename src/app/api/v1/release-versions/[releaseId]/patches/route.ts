import {
  createPatch,
  listPatches,
  ReleasePatchesParamsSchema,
} from "~/server/rest/controllers/patches.controller";
import {
  createRestHandler,
  jsonResponse,
  parseJsonBody,
} from "~/server/rest/handler";
import { PatchCreateSchema } from "~/shared/schemas/patch";

export const GET = createRestHandler(async ({ params, context }) => {
  const { releaseId } = ReleasePatchesParamsSchema.parse(params);
  const data = await listPatches(context, releaseId);
  return jsonResponse(data);
});

export const POST = createRestHandler(async ({ params, context, req }) => {
  const { releaseId } = ReleasePatchesParamsSchema.parse(params);
  const input = await parseJsonBody(req, PatchCreateSchema);
  const result = await createPatch(context, releaseId, input);
  return jsonResponse(result, { status: 201 });
});
