import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ReleaseVersionScalarWhereInputObjectSchema } from './ReleaseVersionScalarWhereInput.schema';
import { ReleaseVersionUpdateManyMutationInputObjectSchema } from './ReleaseVersionUpdateManyMutationInput.schema';
import { ReleaseVersionUncheckedUpdateManyWithoutCreatedByInputObjectSchema } from './ReleaseVersionUncheckedUpdateManyWithoutCreatedByInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => ReleaseVersionScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => ReleaseVersionUpdateManyMutationInputObjectSchema), z.lazy(() => ReleaseVersionUncheckedUpdateManyWithoutCreatedByInputObjectSchema)])
}).strict();
export const ReleaseVersionUpdateManyWithWhereWithoutCreatedByInputObjectSchema: z.ZodType<Prisma.ReleaseVersionUpdateManyWithWhereWithoutCreatedByInput> = makeSchema() as unknown as z.ZodType<Prisma.ReleaseVersionUpdateManyWithWhereWithoutCreatedByInput>;
export const ReleaseVersionUpdateManyWithWhereWithoutCreatedByInputObjectZodSchema = makeSchema();
