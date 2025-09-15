import { z } from "zod";
import { ReleaseVersionSelectObjectSchema } from "./objects/ReleaseVersionSelect.schema";
import { ReleaseVersionUpdateManyMutationInputObjectSchema } from "./objects/ReleaseVersionUpdateManyMutationInput.schema";
import { ReleaseVersionWhereInputObjectSchema } from "./objects/ReleaseVersionWhereInput.schema";

export const ReleaseVersionUpdateManyAndReturnSchema = z
  .object({
    select: ReleaseVersionSelectObjectSchema.optional(),
    data: ReleaseVersionUpdateManyMutationInputObjectSchema,
    where: ReleaseVersionWhereInputObjectSchema.optional(),
  })
  .strict();
