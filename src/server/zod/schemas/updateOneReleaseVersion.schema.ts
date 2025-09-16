import { z } from "zod";
import { ReleaseVersionSelectObjectSchema } from "./objects/ReleaseVersionSelect.schema";
import { ReleaseVersionIncludeObjectSchema } from "./objects/ReleaseVersionInclude.schema";
import { ReleaseVersionUpdateInputObjectSchema } from "./objects/ReleaseVersionUpdateInput.schema";
import { ReleaseVersionUncheckedUpdateInputObjectSchema } from "./objects/ReleaseVersionUncheckedUpdateInput.schema";
import { ReleaseVersionWhereUniqueInputObjectSchema } from "./objects/ReleaseVersionWhereUniqueInput.schema";

export const ReleaseVersionUpdateOneSchema = z.object({
  select: ReleaseVersionSelectObjectSchema.optional(),
  include: ReleaseVersionIncludeObjectSchema.optional(),
  data: z.union([
    ReleaseVersionUpdateInputObjectSchema,
    ReleaseVersionUncheckedUpdateInputObjectSchema,
  ]),
  where: ReleaseVersionWhereUniqueInputObjectSchema,
});
