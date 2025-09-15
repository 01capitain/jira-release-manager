import { z } from "zod";

// prettier-ignore
export const ReleaseVersionInputSchema = z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    createdBy: z.unknown(),
    createdById: z.string()
}).strict();

export type ReleaseVersionInputType = z.infer<typeof ReleaseVersionInputSchema>;
