import { z } from "zod";

// prettier-ignore
export const ReleaseVersionModelSchema = z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    createdBy: z.unknown(),
    createdById: z.string()
}).strict();

export type ReleaseVersionModelType = z.infer<typeof ReleaseVersionModelSchema>;
