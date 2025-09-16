import { z } from "zod";

export const BuiltVersionCreateSchema = z.object({
  versionId: z.string().uuid("Invalid release version id"),
  name: z.string().trim().min(1, "Please enter a name."),
});

export type BuiltVersionCreateInput = z.infer<typeof BuiltVersionCreateSchema>;
