import { IsoTimestampSchema } from "~/shared/types/iso8601";
import type { ReleaseVersionDto } from "~/shared/types/release-version";
import { UuidV7Schema } from "~/shared/types/uuid";
import { ReleaseVersionModelSchema } from "~/server/zod/schemas/variants/pure/ReleaseVersion.pure";

const ReleaseVersionModelFieldsSchema = ReleaseVersionModelSchema.pick({
  id: true,
  name: true,
  createdAt: true,
}).strip();

// Public DTO schema (explicitly controls fields exposed to clients)
export const ReleaseVersionDtoSchema = ReleaseVersionModelFieldsSchema.omit({
  id: true,
  createdAt: true,
})
  .extend({
    id: UuidV7Schema,
    createdAt: IsoTimestampSchema,
  })
  .meta({
    id: "ReleaseVersion",
    title: "Release Version",
    description: "Release version summary information.",
  });

export const ReleaseVersionIdSchema = ReleaseVersionDtoSchema.shape.id;

// Helper to convert from Prisma model (via generated schema) to DTO
export function toReleaseVersionDto(model: unknown): ReleaseVersionDto {
  const parsed = ReleaseVersionModelFieldsSchema.parse(model);
  const dto: ReleaseVersionDto = {
    id: UuidV7Schema.parse(parsed.id),
    name: parsed.name,
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
