import { z } from "zod";

export const BuiltVersionCreateSchema = z.object({
  versionId: z.string().uuid("Invalid release version id"),
  name: z.string().trim().min(1, "Please enter a name."),
});

export const BuiltVersionListByReleaseSchema = z.object({
  versionId: z.string().uuid("Invalid release version id"),
});

export const BuiltVersionDefaultSelectionInputSchema = z.object({
  builtVersionId: z.string().uuid("Invalid built version id"),
});

export type BuiltVersionCreateInput = z.infer<typeof BuiltVersionCreateSchema>;
export type BuiltVersionListByReleaseInput = z.infer<
  typeof BuiltVersionListByReleaseSchema
>;
export type BuiltVersionDefaultSelectionInput = z.infer<
  typeof BuiltVersionDefaultSelectionInputSchema
>;
