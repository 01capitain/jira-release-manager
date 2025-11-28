import { z } from "zod";

import { ComponentVersionService } from "~/server/services/component-version.service";
import type { RestContext } from "~/server/rest/context";
import { ComponentVersionDtoSchema } from "~/server/zod/dto/component-version.dto";

export const ComponentVersionByPatchParamsSchema = z.object({
  patchId: z.uuidv7(),
});

export const listComponentVersionsByPatch = async (
  context: RestContext,
  patchId: string,
) => {
  const svc = new ComponentVersionService(context.db);
  const rows = await svc.listByPatch(patchId);
  return z.array(ComponentVersionDtoSchema).parse(rows);
};
