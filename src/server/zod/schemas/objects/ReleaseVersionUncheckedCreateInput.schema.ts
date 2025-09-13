import { z } from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional(),
  name: z.string(),
  createdAt: z.coerce.date().optional(),
  createdById: z.string()
}).strict();
export const ReleaseVersionUncheckedCreateInputObjectSchema: z.ZodType<Prisma.ReleaseVersionUncheckedCreateInput> = makeSchema() as unknown as z.ZodType<Prisma.ReleaseVersionUncheckedCreateInput>;
export const ReleaseVersionUncheckedCreateInputObjectZodSchema = makeSchema();
