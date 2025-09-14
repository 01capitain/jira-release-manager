import { z } from 'zod';
import { ReleaseVersionSelectObjectSchema } from './objects/ReleaseVersionSelect.schema';
import { ReleaseVersionIncludeObjectSchema } from './objects/ReleaseVersionInclude.schema';
import { ReleaseVersionWhereUniqueInputObjectSchema } from './objects/ReleaseVersionWhereUniqueInput.schema';

export const ReleaseVersionDeleteOneSchema = z.object({ select: ReleaseVersionSelectObjectSchema.optional(), include: ReleaseVersionIncludeObjectSchema.optional(), where: ReleaseVersionWhereUniqueInputObjectSchema  })