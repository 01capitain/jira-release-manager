import { z } from 'zod';
import { ReleaseVersionSelectObjectSchema } from './objects/ReleaseVersionSelect.schema';
import { ReleaseVersionIncludeObjectSchema } from './objects/ReleaseVersionInclude.schema';
import { ReleaseVersionCreateInputObjectSchema } from './objects/ReleaseVersionCreateInput.schema';
import { ReleaseVersionUncheckedCreateInputObjectSchema } from './objects/ReleaseVersionUncheckedCreateInput.schema';

export const ReleaseVersionCreateOneSchema = z.object({ select: ReleaseVersionSelectObjectSchema.optional(), include: ReleaseVersionIncludeObjectSchema.optional(), data: z.union([ReleaseVersionCreateInputObjectSchema, ReleaseVersionUncheckedCreateInputObjectSchema])  })