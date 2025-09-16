import { z } from "zod";
export const ReleaseVersionFindFirstResultSchema = z.nullable(
  z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    createdBy: z.unknown(),
    createdById: z.string(),
  }),
);
