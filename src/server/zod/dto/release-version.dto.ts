import { z } from "zod";

import { IsoTimestampSchema } from "~/shared/types/iso8601";
import type { ReleaseVersionDto } from "~/shared/types/release-version";
import { ReleaseTrackSchema } from "~/shared/types/release-track";
import { UuidV7Schema } from "~/shared/types/uuid";
import { ReleaseVersionModelSchema } from "~/server/zod/schemas/variants/pure/ReleaseVersion.pure";

const ReleaseVersionModelSchemaWithTrack = ReleaseVersionModelSchema.extend({
  releaseTrack: z.string(),
});

const ReleaseVersionModelFieldsSchema = ReleaseVersionModelSchemaWithTrack.pick(
  {
    id: true,
    name: true,
    releaseTrack: true,
    createdAt: true,
  },
).strip();

export const ReleaseVersionTrackSchema = ReleaseTrackSchema.meta({
  id: "ReleaseVersionTrack",
  title: "Release Version Track",
  description: "Lifecycle track for a release version.",
});

// Public DTO schema (explicitly controls fields exposed to clients)
export const ReleaseVersionDtoSchema = ReleaseVersionModelFieldsSchema.omit({
  id: true,
  releaseTrack: true,
  createdAt: true,
})
  .extend({
    id: UuidV7Schema,
    releaseTrack: ReleaseVersionTrackSchema,
    createdAt: IsoTimestampSchema,
  })
  .meta({
    id: "ReleaseVersion",
    title: "Release Version",
    description: "Release version summary information.",
  });

export const ReleaseVersionDefaultsDtoSchema = ReleaseVersionDtoSchema.pick({
  name: true,
  releaseTrack: true,
}).meta({
  id: "ReleaseVersionDefaults",
  title: "Release Version Defaults",
  description: "Suggested values for a new release version.",
});

export const ReleaseVersionIdSchema = ReleaseVersionDtoSchema.shape.id;

// Helper to convert from Prisma model (via generated schema) to DTO
export function toReleaseVersionDto(model: unknown): ReleaseVersionDto {
  const parsed = ReleaseVersionModelFieldsSchema.parse(model);
  const dto: ReleaseVersionDto = {
    id: UuidV7Schema.parse(parsed.id),
    name: parsed.name,
    releaseTrack: ReleaseVersionTrackSchema.parse(parsed.releaseTrack),
    createdAt: parsed.createdAt.toISOString() as ReleaseVersionDto["createdAt"],
  };
  // Validate the DTO we constructed to ensure the shape remains consistent
  return ReleaseVersionDtoSchema.strip().parse(dto);
}

export function mapToReleaseVersionDtos(
  models: unknown[],
): ReleaseVersionDto[] {
  return models.map((m) => toReleaseVersionDto(m));
}
