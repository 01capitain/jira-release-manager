import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { UserOrderByWithRelationInputObjectSchema } from './UserOrderByWithRelationInput.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  name: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional(),
  createdById: SortOrderSchema.optional(),
  createdBy: z.lazy(() => UserOrderByWithRelationInputObjectSchema).optional()
}).strict();
export const ReleaseVersionOrderByWithRelationInputObjectSchema: z.ZodType<Prisma.ReleaseVersionOrderByWithRelationInput> = makeSchema() as unknown as z.ZodType<Prisma.ReleaseVersionOrderByWithRelationInput>;
export const ReleaseVersionOrderByWithRelationInputObjectZodSchema = makeSchema();
