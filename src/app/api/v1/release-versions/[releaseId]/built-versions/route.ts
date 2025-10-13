import {
  createBuiltVersion,
  listBuiltVersions,
  ReleaseBuiltVersionsParamsSchema,
} from "~/server/rest/controllers/built-versions.controller";
import {
  createRestHandler,
  jsonResponse,
  parseJsonBody,
} from "~/server/rest/handler";
import { BuiltVersionCreateSchema } from "~/shared/schemas/built-version";

export const GET = createRestHandler(async ({ params, context }) => {
  const { releaseId } = ReleaseBuiltVersionsParamsSchema.parse(params);
  const data = await listBuiltVersions(context, releaseId);
  return jsonResponse(data);
});

export const POST = createRestHandler(async ({ params, context, req }) => {
  const { releaseId } = ReleaseBuiltVersionsParamsSchema.parse(params);
  const input = await parseJsonBody(req, BuiltVersionCreateSchema);
  const result = await createBuiltVersion(context, releaseId, input);
  return jsonResponse(result, { status: 201 });
});
