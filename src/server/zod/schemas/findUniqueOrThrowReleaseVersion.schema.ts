import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { ReleaseVersionSelectObjectSchema } from "./objects/ReleaseVersionSelect.schema";
import { ReleaseVersionIncludeObjectSchema } from "./objects/ReleaseVersionInclude.schema";
import { ReleaseVersionWhereUniqueInputObjectSchema } from "./objects/ReleaseVersionWhereUniqueInput.schema";

export const ReleaseVersionFindUniqueOrThrowSchema: z.ZodType<Prisma.ReleaseVersionFindUniqueOrThrowArgs> =
  z
    .object({
      select: ReleaseVersionSelectObjectSchema.optional(),
      include: ReleaseVersionIncludeObjectSchema.optional(),
      where: ReleaseVersionWhereUniqueInputObjectSchema,
    })
    .strict() as unknown as z.ZodType<Prisma.ReleaseVersionFindUniqueOrThrowArgs>;

export const ReleaseVersionFindUniqueOrThrowZodSchema = z
  .object({
    select: ReleaseVersionSelectObjectSchema.optional(),
    include: ReleaseVersionIncludeObjectSchema.optional(),
    where: ReleaseVersionWhereUniqueInputObjectSchema,
  })
  .strict();
