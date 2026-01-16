import { z } from "zod";
import { ReleaseTrackSchema } from "~/shared/types/release-track";

// Input schema for creating a ReleaseVersion (shared by client and server)
export const ReleaseVersionCreateSchema = z.object({
  name: z.string().trim().min(1, { error: "Please enter a name." }).optional(),
  releaseTrack: ReleaseTrackSchema.optional(),
});

export type ReleaseVersionCreateInput = z.infer<
  typeof ReleaseVersionCreateSchema
>;

const ReleaseVersionUpdateFields = z.object({
  name: z.string().trim().min(1, { error: "Please enter a name." }).optional(),
  releaseTrack: ReleaseTrackSchema.optional(),
});

export const ReleaseVersionUpdateSchema = ReleaseVersionUpdateFields.refine(
  (value) => value.name !== undefined || value.releaseTrack !== undefined,
  { message: "Provide a name or releaseTrack to update." },
);

export type ReleaseVersionUpdateInput = z.infer<
  typeof ReleaseVersionUpdateSchema
>;

export const ReleaseVersionTrackUpdateSchema = ReleaseVersionUpdateFields.pick({
  releaseTrack: true,
}).refine((value) => value.releaseTrack !== undefined, {
  message: "releaseTrack is required",
});

export type ReleaseVersionTrackUpdateInput = z.infer<
  typeof ReleaseVersionTrackUpdateSchema
>;
