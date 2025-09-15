import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { ReleaseVersionOrderByWithRelationInputObjectSchema } from "./objects/ReleaseVersionOrderByWithRelationInput.schema";
import { ReleaseVersionWhereInputObjectSchema } from "./objects/ReleaseVersionWhereInput.schema";
import { ReleaseVersionWhereUniqueInputObjectSchema } from "./objects/ReleaseVersionWhereUniqueInput.schema";
import { ReleaseVersionCountAggregateInputObjectSchema } from "./objects/ReleaseVersionCountAggregateInput.schema";

export const ReleaseVersionCountSchema: z.ZodType<Prisma.ReleaseVersionCountArgs> =
  z
    .object({
      orderBy: z
        .union([
          ReleaseVersionOrderByWithRelationInputObjectSchema,
          ReleaseVersionOrderByWithRelationInputObjectSchema.array(),
        ])
        .optional(),
      where: ReleaseVersionWhereInputObjectSchema.optional(),
      cursor: ReleaseVersionWhereUniqueInputObjectSchema.optional(),
      take: z.number().optional(),
      skip: z.number().optional(),
      select: z
        .union([z.literal(true), ReleaseVersionCountAggregateInputObjectSchema])
        .optional(),
    })
    .strict() as unknown as z.ZodType<Prisma.ReleaseVersionCountArgs>;

export const ReleaseVersionCountZodSchema = z
  .object({
    orderBy: z
      .union([
        ReleaseVersionOrderByWithRelationInputObjectSchema,
        ReleaseVersionOrderByWithRelationInputObjectSchema.array(),
      ])
      .optional(),
    where: ReleaseVersionWhereInputObjectSchema.optional(),
    cursor: ReleaseVersionWhereUniqueInputObjectSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
    select: z
      .union([z.literal(true), ReleaseVersionCountAggregateInputObjectSchema])
      .optional(),
  })
  .strict();
