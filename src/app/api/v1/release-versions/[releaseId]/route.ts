import {
  getReleaseVersion,
  ReleaseVersionIdParamSchema,
  parseReleaseVersionRelations,
  updateReleaseVersion,
  ReleaseVersionUpdateSchema,
} from "~/server/rest/controllers/release-versions.controller";
import {
  createRestHandler,
  jsonResponse,
  parseJsonBody,
} from "~/server/rest/handler";

export const GET = createRestHandler(async ({ req, context, params }) => {
  const { releaseId } = ReleaseVersionIdParamSchema.parse(params);
  const relations = parseReleaseVersionRelations(req.nextUrl.searchParams);
  const data = await getReleaseVersion(context, releaseId, relations);
  return jsonResponse(data);
});

export const PATCH = createRestHandler(async ({ req, context, params }) => {
  const { releaseId } = ReleaseVersionIdParamSchema.parse(params);
  const input = await parseJsonBody(req, ReleaseVersionUpdateSchema);
  const data = await updateReleaseVersion(context, releaseId, input);
  return jsonResponse(data);
});
