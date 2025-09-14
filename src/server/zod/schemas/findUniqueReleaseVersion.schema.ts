import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { ReleaseVersionSelectObjectSchema } from './objects/ReleaseVersionSelect.schema';
import { ReleaseVersionIncludeObjectSchema } from './objects/ReleaseVersionInclude.schema';
import { ReleaseVersionWhereUniqueInputObjectSchema } from './objects/ReleaseVersionWhereUniqueInput.schema';

export const ReleaseVersionFindUniqueSchema: z.ZodType<Prisma.ReleaseVersionFindUniqueArgs> = z.object({ select: ReleaseVersionSelectObjectSchema.optional(), include: ReleaseVersionIncludeObjectSchema.optional(), where: ReleaseVersionWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.ReleaseVersionFindUniqueArgs>;

export const ReleaseVersionFindUniqueZodSchema = z.object({ select: ReleaseVersionSelectObjectSchema.optional(), include: ReleaseVersionIncludeObjectSchema.optional(), where: ReleaseVersionWhereUniqueInputObjectSchema }).strict();