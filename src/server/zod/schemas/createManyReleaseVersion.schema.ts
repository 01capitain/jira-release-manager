import { z } from 'zod';
import { ReleaseVersionCreateManyInputObjectSchema } from './objects/ReleaseVersionCreateManyInput.schema';

export const ReleaseVersionCreateManySchema = z.object({ data: z.union([ ReleaseVersionCreateManyInputObjectSchema, z.array(ReleaseVersionCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() })