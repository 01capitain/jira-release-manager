import {
  getReleaseVersion,
  ReleaseVersionIdParamSchema,
} from "~/server/rest/controllers/release-versions.controller";
import { createRestHandler, jsonResponse } from "~/server/rest/handler";

export const GET = createRestHandler(async ({ context, params }) => {
  const { releaseId } = ReleaseVersionIdParamSchema.parse(params);
  const data = await getReleaseVersion(context, releaseId);
  return jsonResponse(data);
});
