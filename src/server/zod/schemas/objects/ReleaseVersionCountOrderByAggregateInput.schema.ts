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
export const ReleaseVersionCountOrderByAggregateInputObjectSchema: z.ZodType<Prisma.ReleaseVersionCountOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.ReleaseVersionCountOrderByAggregateInput>;
export const ReleaseVersionCountOrderByAggregateInputObjectZodSchema = makeSchema();
