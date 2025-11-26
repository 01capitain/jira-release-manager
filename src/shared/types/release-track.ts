import { z } from "zod";

export const RELEASE_TRACK_VALUES = [
  "Future",
  "Beta",
  "Rollout",
  "Active",
  "Archived",
] as const;

export type ReleaseTrack = (typeof RELEASE_TRACK_VALUES)[number];

export const ReleaseTrackSchema = z.enum(RELEASE_TRACK_VALUES);

export const DEFAULT_RELEASE_TRACK: ReleaseTrack = "Future";
