import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UuidFilterObjectSchema } from './UuidFilter.schema';
import { StringFilterObjectSchema } from './StringFilter.schema';
import { DateTimeFilterObjectSchema } from './DateTimeFilter.schema';
import { UserScalarRelationFilterObjectSchema } from './UserScalarRelationFilter.schema';
import { UserWhereInputObjectSchema } from './UserWhereInput.schema'

const releaseversionwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => ReleaseVersionWhereInputObjectSchema), z.lazy(() => ReleaseVersionWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => ReleaseVersionWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => ReleaseVersionWhereInputObjectSchema), z.lazy(() => ReleaseVersionWhereInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => UuidFilterObjectSchema), z.string()]).optional(),
  name: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  createdAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  createdById: z.union([z.lazy(() => UuidFilterObjectSchema), z.string()]).optional(),
  createdBy: z.union([z.lazy(() => UserScalarRelationFilterObjectSchema), z.lazy(() => UserWhereInputObjectSchema)]).optional()
}).strict();
export const ReleaseVersionWhereInputObjectSchema: z.ZodType<Prisma.ReleaseVersionWhereInput> = releaseversionwhereinputSchema as unknown as z.ZodType<Prisma.ReleaseVersionWhereInput>;
export const ReleaseVersionWhereInputObjectZodSchema = releaseversionwhereinputSchema;
