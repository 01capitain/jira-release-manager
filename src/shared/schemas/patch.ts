import { z } from "zod";

export const PatchCreateSchema = z.object({
  versionId: z.uuidv7({ error: "Invalid release version id" }),
  name: z.string().trim().min(1, { error: "Please enter a name." }),
});

export const PatchListByReleaseSchema = z.object({
  versionId: z.uuidv7({ error: "Invalid release version id" }),
});

export const PatchDefaultSelectionInputSchema = z.object({
  patchId: z.uuidv7({ error: "Invalid patch id" }),
});

export type PatchCreateInput = z.infer<typeof PatchCreateSchema>;
export type PatchListByReleaseInput = z.infer<
  typeof PatchListByReleaseSchema
>;
export type PatchDefaultSelectionInput = z.infer<
  typeof PatchDefaultSelectionInputSchema
>;
