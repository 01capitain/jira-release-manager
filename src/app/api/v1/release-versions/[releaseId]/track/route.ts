import {
  ReleaseVersionIdParamSchema,
  updateReleaseVersionTrack,
} from "~/server/rest/controllers/release-versions.controller";
import { ReleaseVersionTrackUpdateSchema } from "~/shared/schemas/release-version";
import {
  createRestHandler,
  jsonResponse,
  parseJsonBody,
} from "~/server/rest/handler";

export const PATCH = createRestHandler(async ({ req, context, params }) => {
  const { releaseId } = ReleaseVersionIdParamSchema.parse(params);
  const input = await parseJsonBody(req, ReleaseVersionTrackUpdateSchema);
  const data = await updateReleaseVersionTrack(context, releaseId, input);
  return jsonResponse(data);
});
