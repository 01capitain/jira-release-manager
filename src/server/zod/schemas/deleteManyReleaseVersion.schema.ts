import { z } from "zod";
import { ReleaseVersionWhereInputObjectSchema } from "./objects/ReleaseVersionWhereInput.schema";

export const ReleaseVersionDeleteManySchema = z.object({
  where: ReleaseVersionWhereInputObjectSchema.optional(),
});
