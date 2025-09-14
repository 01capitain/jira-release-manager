import { z } from "zod";
import { IsoTimestampSchema } from "~/shared/types/iso8601";
import type { ReleaseVersionDto } from "~/shared/types/release-version";
import { ReleaseVersionModelSchema } from "~/server/zod/schemas/variants/pure/ReleaseVersion.pure";

// Public DTO schema (explicitly controls fields exposed to clients)
export const ReleaseVersionDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: IsoTimestampSchema,
});

// Helper to convert from Prisma model (via generated schema) to DTO
export function toReleaseVersionDto(model: unknown): ReleaseVersionDto {
  const parsed = ReleaseVersionModelSchema.pick({
    id: true,
    name: true,
    createdAt: true,
  }).parse(model);
  const dto: ReleaseVersionDto = {
    id: parsed.id,
    name: parsed.name,
    createdAt: parsed.createdAt.toISOString() as ReleaseVersionDto["createdAt"],
  };
  // Validate the DTO we constructed to ensure the shape remains consistent
  return ReleaseVersionDtoSchema.parse(dto);
}

export function mapToReleaseVersionDtos(
  models: unknown[],
): ReleaseVersionDto[] {
  return models.map((m) => toReleaseVersionDto(m));
}
