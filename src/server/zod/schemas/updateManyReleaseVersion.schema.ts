import { z } from "zod";
import { ReleaseVersionUpdateManyMutationInputObjectSchema } from "./objects/ReleaseVersionUpdateManyMutationInput.schema";
import { ReleaseVersionWhereInputObjectSchema } from "./objects/ReleaseVersionWhereInput.schema";

export const ReleaseVersionUpdateManySchema = z.object({
  data: ReleaseVersionUpdateManyMutationInputObjectSchema,
  where: ReleaseVersionWhereInputObjectSchema.optional(),
});
