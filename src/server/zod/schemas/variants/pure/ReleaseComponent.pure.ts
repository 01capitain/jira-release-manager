import { z } from "zod";

// prettier-ignore
export const ReleaseComponentModelSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  color: z.string(),
  namingPattern: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.unknown(),
  createdById: z.string(),
}).passthrough();

export type ReleaseComponentModelType = z.infer<
  typeof ReleaseComponentModelSchema
>;
