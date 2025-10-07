import { z } from "zod";

// Input schema for creating a ReleaseVersion (shared by client and server)
export const ReleaseVersionCreateSchema = z.object({
  name: z.string().trim().min(1, { error: "Please enter a name." }),
});

export type ReleaseVersionCreateInput = z.infer<
  typeof ReleaseVersionCreateSchema
>;
