import { z } from "zod";
import { ReleaseTrackSchema } from "~/shared/types/release-track";

// Input schema for creating a ReleaseVersion (shared by client and server)
export const ReleaseVersionCreateSchema = z.object({
  name: z.string().trim().min(1, { error: "Please enter a name." }),
});

export type ReleaseVersionCreateInput = z.infer<
  typeof ReleaseVersionCreateSchema
>;

export const ReleaseVersionTrackUpdateSchema = z.object({
  releaseTrack: ReleaseTrackSchema,
});

export type ReleaseVersionTrackUpdateInput = z.infer<
  typeof ReleaseVersionTrackUpdateSchema
>;
