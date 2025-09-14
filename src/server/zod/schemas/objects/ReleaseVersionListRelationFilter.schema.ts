import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ReleaseVersionWhereInputObjectSchema } from './ReleaseVersionWhereInput.schema'

const makeSchema = () => z.object({
  every: z.lazy(() => ReleaseVersionWhereInputObjectSchema).optional(),
  some: z.lazy(() => ReleaseVersionWhereInputObjectSchema).optional(),
  none: z.lazy(() => ReleaseVersionWhereInputObjectSchema).optional()
}).strict();
export const ReleaseVersionListRelationFilterObjectSchema: z.ZodType<Prisma.ReleaseVersionListRelationFilter> = makeSchema() as unknown as z.ZodType<Prisma.ReleaseVersionListRelationFilter>;
export const ReleaseVersionListRelationFilterObjectZodSchema = makeSchema();
