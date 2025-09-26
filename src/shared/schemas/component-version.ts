import { z } from "zod";

export const ComponentVersionListByBuiltSchema = z.object({
  builtVersionId: z.string().uuid("Invalid built version id"),
});

export type ComponentVersionListByBuiltInput = z.infer<
  typeof ComponentVersionListByBuiltSchema
>;
