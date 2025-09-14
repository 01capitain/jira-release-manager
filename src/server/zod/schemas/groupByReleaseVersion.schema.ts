import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { ReleaseVersionWhereInputObjectSchema } from './objects/ReleaseVersionWhereInput.schema';
import { ReleaseVersionOrderByWithAggregationInputObjectSchema } from './objects/ReleaseVersionOrderByWithAggregationInput.schema';
import { ReleaseVersionScalarWhereWithAggregatesInputObjectSchema } from './objects/ReleaseVersionScalarWhereWithAggregatesInput.schema';
import { ReleaseVersionScalarFieldEnumSchema } from './enums/ReleaseVersionScalarFieldEnum.schema';
import { ReleaseVersionCountAggregateInputObjectSchema } from './objects/ReleaseVersionCountAggregateInput.schema';
import { ReleaseVersionMinAggregateInputObjectSchema } from './objects/ReleaseVersionMinAggregateInput.schema';
import { ReleaseVersionMaxAggregateInputObjectSchema } from './objects/ReleaseVersionMaxAggregateInput.schema';

export const ReleaseVersionGroupBySchema: z.ZodType<Prisma.ReleaseVersionGroupByArgs> = z.object({ where: ReleaseVersionWhereInputObjectSchema.optional(), orderBy: z.union([ReleaseVersionOrderByWithAggregationInputObjectSchema, ReleaseVersionOrderByWithAggregationInputObjectSchema.array()]).optional(), having: ReleaseVersionScalarWhereWithAggregatesInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), by: z.array(ReleaseVersionScalarFieldEnumSchema), _count: z.union([ z.literal(true), ReleaseVersionCountAggregateInputObjectSchema ]).optional(), _min: ReleaseVersionMinAggregateInputObjectSchema.optional(), _max: ReleaseVersionMaxAggregateInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.ReleaseVersionGroupByArgs>;

export const ReleaseVersionGroupByZodSchema = z.object({ where: ReleaseVersionWhereInputObjectSchema.optional(), orderBy: z.union([ReleaseVersionOrderByWithAggregationInputObjectSchema, ReleaseVersionOrderByWithAggregationInputObjectSchema.array()]).optional(), having: ReleaseVersionScalarWhereWithAggregatesInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), by: z.array(ReleaseVersionScalarFieldEnumSchema), _count: z.union([ z.literal(true), ReleaseVersionCountAggregateInputObjectSchema ]).optional(), _min: ReleaseVersionMinAggregateInputObjectSchema.optional(), _max: ReleaseVersionMaxAggregateInputObjectSchema.optional() }).strict();