import { z } from "zod";
import { ReleaseVersionSelectObjectSchema } from "./objects/ReleaseVersionSelect.schema";
import { ReleaseVersionCreateManyInputObjectSchema } from "./objects/ReleaseVersionCreateManyInput.schema";

export const ReleaseVersionCreateManyAndReturnSchema = z
  .object({
    select: ReleaseVersionSelectObjectSchema.optional(),
    data: z.union([
      ReleaseVersionCreateManyInputObjectSchema,
      z.array(ReleaseVersionCreateManyInputObjectSchema),
    ]),
    skipDuplicates: z.boolean().optional(),
  })
  .strict();
