import { ReleaseComponentModelSchema } from "~/server/zod/schemas/variants/pure/ReleaseComponent.pure";
import { IsoTimestampSchema } from "~/shared/types/iso8601";
import type { ReleaseComponentDto } from "~/shared/types/release-component";

const ReleaseComponentModelFieldsSchema = ReleaseComponentModelSchema.pick({
  id: true,
  name: true,
  color: true,
  namingPattern: true,
  createdAt: true,
}).strip();
export const ReleaseComponentDtoSchema = ReleaseComponentModelFieldsSchema.omit(
  { createdAt: true },
)
  .extend({
    createdAt: IsoTimestampSchema,
  })
  .meta({
    id: "ReleaseComponent",
    title: "Release Component",
    description: "Release component metadata.",
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
