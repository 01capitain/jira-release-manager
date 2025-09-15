import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { ReleaseVersionIncludeObjectSchema } from "./objects/ReleaseVersionInclude.schema";
import { ReleaseVersionOrderByWithRelationInputObjectSchema } from "./objects/ReleaseVersionOrderByWithRelationInput.schema";
import { ReleaseVersionWhereInputObjectSchema } from "./objects/ReleaseVersionWhereInput.schema";
import { ReleaseVersionWhereUniqueInputObjectSchema } from "./objects/ReleaseVersionWhereUniqueInput.schema";
import { ReleaseVersionScalarFieldEnumSchema } from "./enums/ReleaseVersionScalarFieldEnum.schema";

// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const ReleaseVersionFindFirstSelectSchema: z.ZodType<Prisma.ReleaseVersionSelect> =
  z
    .object({
      id: z.boolean().optional(),
      name: z.boolean().optional(),
      createdAt: z.boolean().optional(),
      updatedAt: z.boolean().optional(),
      createdBy: z.boolean().optional(),
      createdById: z.boolean().optional(),
    })
    .strict() as unknown as z.ZodType<Prisma.ReleaseVersionSelect>;

export const ReleaseVersionFindFirstSelectZodSchema = z
  .object({
    id: z.boolean().optional(),
    name: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    createdBy: z.boolean().optional(),
    createdById: z.boolean().optional(),
  })
  .strict();

export const ReleaseVersionFindFirstSchema: z.ZodType<Prisma.ReleaseVersionFindFirstArgs> =
  z
    .object({
      select: ReleaseVersionFindFirstSelectSchema.optional(),
      include: z.lazy(() => ReleaseVersionIncludeObjectSchema.optional()),
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
      distinct: z
        .union([
          ReleaseVersionScalarFieldEnumSchema,
          ReleaseVersionScalarFieldEnumSchema.array(),
        ])
        .optional(),
    })
    .strict() as unknown as z.ZodType<Prisma.ReleaseVersionFindFirstArgs>;

export const ReleaseVersionFindFirstZodSchema = z
  .object({
    select: ReleaseVersionFindFirstSelectSchema.optional(),
    include: z.lazy(() => ReleaseVersionIncludeObjectSchema.optional()),
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
    distinct: z
      .union([
        ReleaseVersionScalarFieldEnumSchema,
        ReleaseVersionScalarFieldEnumSchema.array(),
      ])
      .optional(),
  })
  .strict();
