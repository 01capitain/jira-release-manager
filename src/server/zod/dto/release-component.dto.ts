import { z } from "zod";
import { IsoTimestampSchema } from "~/shared/types/iso8601";
import type { ReleaseComponentDto } from "~/shared/types/release-component";
import { ReleaseComponentModelSchema } from "~/server/zod/schemas/variants/pure/ReleaseComponent.pure";

export const ReleaseComponentDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  namingPattern: z.string(),
  createdAt: IsoTimestampSchema,
});

export function toReleaseComponentDto(model: unknown): ReleaseComponentDto {
  const parsed = ReleaseComponentModelSchema.pick({
    id: true,
    name: true,
    color: true,
    namingPattern: true,
    createdAt: true,
  })
    .strip()
    .parse(model);
  const dto: ReleaseComponentDto = {
    id: parsed.id,
    name: parsed.name,
    color: parsed.color,
    namingPattern: parsed.namingPattern,
    createdAt:
      parsed.createdAt.toISOString() as ReleaseComponentDto["createdAt"],
  };
  return ReleaseComponentDtoSchema.strip().parse(dto);
}

export function mapToReleaseComponentDtos(
  models: unknown[],
): ReleaseComponentDto[] {
  return models.map((m) => toReleaseComponentDto(m));
}
