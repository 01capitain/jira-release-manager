import { z } from "zod";

export const BuiltVersionDefaultSelectionSchema = z.object({
  selectedReleaseComponentIds: z.array(z.string().uuid("Invalid release component id")),
});
