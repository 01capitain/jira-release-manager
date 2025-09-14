import { z } from 'zod';
import { ReleaseVersionSelectObjectSchema } from './objects/ReleaseVersionSelect.schema';
import { ReleaseVersionIncludeObjectSchema } from './objects/ReleaseVersionInclude.schema';
import { ReleaseVersionWhereUniqueInputObjectSchema } from './objects/ReleaseVersionWhereUniqueInput.schema';
import { ReleaseVersionCreateInputObjectSchema } from './objects/ReleaseVersionCreateInput.schema';
import { ReleaseVersionUncheckedCreateInputObjectSchema } from './objects/ReleaseVersionUncheckedCreateInput.schema';
import { ReleaseVersionUpdateInputObjectSchema } from './objects/ReleaseVersionUpdateInput.schema';
import { ReleaseVersionUncheckedUpdateInputObjectSchema } from './objects/ReleaseVersionUncheckedUpdateInput.schema';

export const ReleaseVersionUpsertSchema = z.object({ select: ReleaseVersionSelectObjectSchema.optional(), include: ReleaseVersionIncludeObjectSchema.optional(), where: ReleaseVersionWhereUniqueInputObjectSchema, create: z.union([ ReleaseVersionCreateInputObjectSchema, ReleaseVersionUncheckedCreateInputObjectSchema ]), update: z.union([ ReleaseVersionUpdateInputObjectSchema, ReleaseVersionUncheckedUpdateInputObjectSchema ])  })