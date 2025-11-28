import { z } from "zod";

export const PatchDefaultSelectionSchema = z.object({
  selectedReleaseComponentIds: z.array(
    z.uuidv7({ error: "Invalid release component id" }),
  ),
});

export type PatchDefaultSelection = z.infer<
  typeof PatchDefaultSelectionSchema
>;
