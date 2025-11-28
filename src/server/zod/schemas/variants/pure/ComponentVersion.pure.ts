import { z } from "zod";

// prettier-ignore
export const ComponentVersionModelSchema = z.object({
  id: z.string().uuid(),
  releaseComponentId: z.string().uuid(),
  patchId: z.string().uuid(),
  name: z.string(),
  increment: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
  releaseComponent: z.unknown(),
  patch: z.unknown(),
}).passthrough();

export type ComponentVersionModelType = z.infer<
  typeof ComponentVersionModelSchema
>;
