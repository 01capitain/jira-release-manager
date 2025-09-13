import { z } from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.literal(true).optional(),
  name: z.literal(true).optional(),
  createdAt: z.literal(true).optional(),
  updatedAt: z.literal(true).optional(),
  createdById: z.literal(true).optional(),
  _all: z.literal(true).optional()
}).strict();
export const ReleaseVersionCountAggregateInputObjectSchema: z.ZodType<Prisma.ReleaseVersionCountAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.ReleaseVersionCountAggregateInputType>;
export const ReleaseVersionCountAggregateInputObjectZodSchema = makeSchema();
