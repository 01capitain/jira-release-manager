import { z } from "zod";

export const BuiltVersionCreateSchema = z.object({
  versionId: z.uuidv7({ error: "Invalid release version id" }),
  name: z.string().trim().min(1, { error: "Please enter a name." }),
});

export const BuiltVersionListByReleaseSchema = z.object({
  versionId: z.uuidv7({ error: "Invalid release version id" }),
});

export const BuiltVersionDefaultSelectionInputSchema = z.object({
  builtVersionId: z.uuidv7({ error: "Invalid built version id" }),
});

export type BuiltVersionCreateInput = z.infer<typeof BuiltVersionCreateSchema>;
export type BuiltVersionListByReleaseInput = z.infer<
  typeof BuiltVersionListByReleaseSchema
>;
export type BuiltVersionDefaultSelectionInput = z.infer<
  typeof BuiltVersionDefaultSelectionInputSchema
>;
