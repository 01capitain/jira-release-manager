import { z } from "zod";

// prettier-ignore
export const PatchModelSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    versionId: z.string().uuid(),
    currentStatus: z.enum(["in_development","in_deployment","active","deprecated"]),
    createdAt: z.date(),
    updatedAt: z.date(),
    createdBy: z.unknown(),
    createdById: z.string()
}).passthrough();

export type PatchModelType = z.infer<typeof PatchModelSchema>;
