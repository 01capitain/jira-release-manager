import { z } from "zod";

// prettier-ignore
export const ReleaseVersionResultSchema = z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    createdBy: z.unknown(),
    createdById: z.string()
}).strict();

export type ReleaseVersionResultType = z.infer<
  typeof ReleaseVersionResultSchema
>;
