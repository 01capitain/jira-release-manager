import { z } from "zod";

export const BuiltVersionDefaultSelectionSchema = z.object({
  selectedReleaseComponentIds: z.array(
    z.uuidv7({ error: "Invalid release component id" }),
  ),
});

export type BuiltVersionDefaultSelection = z.infer<
  typeof BuiltVersionDefaultSelectionSchema
>;
