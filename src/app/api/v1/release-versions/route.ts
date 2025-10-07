import {
  createReleaseVersion,
  listReleaseVersions,
  ReleaseVersionListQuerySchema,
} from "~/server/rest/controllers/release-versions.controller";
import { ReleaseVersionCreateSchema } from "~/shared/schemas/release-version";
import {
  createRestHandler,
  jsonResponse,
  parseJsonBody,
  parseSearchParams,
} from "~/server/rest/handler";

export const GET = createRestHandler(async ({ req, context }) => {
  const query = parseSearchParams(req, ReleaseVersionListQuerySchema);
  const data = await listReleaseVersions(context, query);
  return jsonResponse(data);
});

export const POST = createRestHandler(async ({ req, context }) => {
  const input = await parseJsonBody(req, ReleaseVersionCreateSchema);
  const result = await createReleaseVersion(context, input);
  return jsonResponse(result, { status: 201 });
});
