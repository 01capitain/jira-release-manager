import { z } from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional(),
  name: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  createdById: z.string()
}).strict();
export const ReleaseVersionCreateManyInputObjectSchema: z.ZodType<Prisma.ReleaseVersionCreateManyInput> = makeSchema() as unknown as z.ZodType<Prisma.ReleaseVersionCreateManyInput>;
export const ReleaseVersionCreateManyInputObjectZodSchema = makeSchema();
