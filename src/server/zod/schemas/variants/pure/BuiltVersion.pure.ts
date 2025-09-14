import { z } from 'zod';

// prettier-ignore
export const BuiltVersionModelSchema = z.object({
    id: z.string(),
    name: z.string(),
    versionId: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    createdBy: z.unknown(),
    createdById: z.string()
}).strict();

export type BuiltVersionModelType = z.infer<typeof BuiltVersionModelSchema>;

