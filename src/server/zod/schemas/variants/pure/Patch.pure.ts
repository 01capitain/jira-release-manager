import { z } from "zod";

// prettier-ignore
export const PatchModelSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    versionId: z.string().uuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
    createdBy: z.unknown(),
    createdById: z.string()
}).passthrough();

export type PatchModelType = z.infer<typeof PatchModelSchema>;
