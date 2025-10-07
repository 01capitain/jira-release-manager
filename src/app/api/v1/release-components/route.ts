import {
  createReleaseComponent,
  listReleaseComponents,
  ReleaseComponentListQuerySchema,
} from "~/server/rest/controllers/release-components.controller";
import { ReleaseComponentCreateSchema } from "~/shared/schemas/release-component";
import {
  createRestHandler,
  jsonResponse,
  parseJsonBody,
  parseSearchParams,
} from "~/server/rest/handler";

export const GET = createRestHandler(async ({ req, context }) => {
  const query = parseSearchParams(req, ReleaseComponentListQuerySchema);
  const data = await listReleaseComponents(context, query);
  return jsonResponse(data);
});

export const POST = createRestHandler(async ({ req, context }) => {
  const input = await parseJsonBody(req, ReleaseComponentCreateSchema);
  const result = await createReleaseComponent(context, input);
  return jsonResponse(result, { status: 201 });
});
