import { z } from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.literal(true).optional(),
  name: z.literal(true).optional(),
  createdAt: z.literal(true).optional(),
  updatedAt: z.literal(true).optional(),
  createdById: z.literal(true).optional()
}).strict();
export const ReleaseVersionMinAggregateInputObjectSchema: z.ZodType<Prisma.ReleaseVersionMinAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.ReleaseVersionMinAggregateInputType>;
export const ReleaseVersionMinAggregateInputObjectZodSchema = makeSchema();
