import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ReleaseVersionWhereUniqueInputObjectSchema } from './ReleaseVersionWhereUniqueInput.schema';
import { ReleaseVersionUpdateWithoutCreatedByInputObjectSchema } from './ReleaseVersionUpdateWithoutCreatedByInput.schema';
import { ReleaseVersionUncheckedUpdateWithoutCreatedByInputObjectSchema } from './ReleaseVersionUncheckedUpdateWithoutCreatedByInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => ReleaseVersionWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => ReleaseVersionUpdateWithoutCreatedByInputObjectSchema), z.lazy(() => ReleaseVersionUncheckedUpdateWithoutCreatedByInputObjectSchema)])
}).strict();
export const ReleaseVersionUpdateWithWhereUniqueWithoutCreatedByInputObjectSchema: z.ZodType<Prisma.ReleaseVersionUpdateWithWhereUniqueWithoutCreatedByInput> = makeSchema() as unknown as z.ZodType<Prisma.ReleaseVersionUpdateWithWhereUniqueWithoutCreatedByInput>;
export const ReleaseVersionUpdateWithWhereUniqueWithoutCreatedByInputObjectZodSchema = makeSchema();
