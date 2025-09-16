import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { ReleaseVersionOrderByWithRelationInputObjectSchema } from "./objects/ReleaseVersionOrderByWithRelationInput.schema";
import { ReleaseVersionWhereInputObjectSchema } from "./objects/ReleaseVersionWhereInput.schema";
import { ReleaseVersionWhereUniqueInputObjectSchema } from "./objects/ReleaseVersionWhereUniqueInput.schema";
import { ReleaseVersionCountAggregateInputObjectSchema } from "./objects/ReleaseVersionCountAggregateInput.schema";
import { ReleaseVersionMinAggregateInputObjectSchema } from "./objects/ReleaseVersionMinAggregateInput.schema";
import { ReleaseVersionMaxAggregateInputObjectSchema } from "./objects/ReleaseVersionMaxAggregateInput.schema";

export const ReleaseVersionAggregateSchema: z.ZodType<Prisma.ReleaseVersionAggregateArgs> =
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
      _count: z
        .union([z.literal(true), ReleaseVersionCountAggregateInputObjectSchema])
        .optional(),
      _min: ReleaseVersionMinAggregateInputObjectSchema.optional(),
      _max: ReleaseVersionMaxAggregateInputObjectSchema.optional(),
    })
    .strict() as unknown as z.ZodType<Prisma.ReleaseVersionAggregateArgs>;

export const ReleaseVersionAggregateZodSchema = z
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
    _count: z
      .union([z.literal(true), ReleaseVersionCountAggregateInputObjectSchema])
      .optional(),
    _min: ReleaseVersionMinAggregateInputObjectSchema.optional(),
    _max: ReleaseVersionMaxAggregateInputObjectSchema.optional(),
  })
  .strict();
