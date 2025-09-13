import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  name: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional(),
  createdById: SortOrderSchema.optional()
}).strict();
export const ReleaseVersionMinOrderByAggregateInputObjectSchema: z.ZodType<Prisma.ReleaseVersionMinOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.ReleaseVersionMinOrderByAggregateInput>;
export const ReleaseVersionMinOrderByAggregateInputObjectZodSchema = makeSchema();
