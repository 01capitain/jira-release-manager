import {
  getReleaseVersion,
  ReleaseVersionIdParamSchema,
  parseReleaseVersionRelations,
} from "~/server/rest/controllers/release-versions.controller";
import { createRestHandler, jsonResponse } from "~/server/rest/handler";

export const GET = createRestHandler(async ({ req, context, params }) => {
  const { releaseId } = ReleaseVersionIdParamSchema.parse(params);
  const relations = parseReleaseVersionRelations(req.nextUrl.searchParams);
  const data = await getReleaseVersion(context, releaseId, relations);
  return jsonResponse(data);
});
