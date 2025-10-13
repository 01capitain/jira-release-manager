import { z } from "zod";

import { ComponentVersionService } from "~/server/services/component-version.service";
import type { RestContext } from "~/server/rest/context";
import { ComponentVersionDtoSchema } from "~/server/zod/dto/component-version.dto";

export const ComponentVersionByBuiltParamsSchema = z.object({
  builtId: z.uuidv7(),
});

export const listComponentVersionsByBuilt = async (
  context: RestContext,
  builtVersionId: string,
) => {
  const svc = new ComponentVersionService(context.db);
  const rows = await svc.listByBuilt(builtVersionId);
  return z.array(ComponentVersionDtoSchema).parse(rows);
};
