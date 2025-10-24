import { ComponentVersionModelSchema } from "~/server/zod/schemas/variants/pure/ComponentVersion.pure";
import type { ComponentVersionDto } from "~/shared/types/component-version";
import { IsoTimestampSchema } from "~/shared/types/iso8601";

const ComponentVersionModelFieldsSchema = ComponentVersionModelSchema.pick({
  id: true,
  releaseComponentId: true,
  builtVersionId: true,
  name: true,
  increment: true,
  createdAt: true,
}).strip();
export const ComponentVersionDtoSchema = ComponentVersionModelFieldsSchema.omit(
  { createdAt: true },
)
  .extend({
    createdAt: IsoTimestampSchema,
  })
  .meta({
    id: "ComponentVersion",
    title: "Component Version",
    description: "Component version details deployed with a built version.",
  });

export function toComponentVersionDto(model: unknown): ComponentVersionDto {
  const parsed = ComponentVersionModelSchema.pick({
    id: true,
    releaseComponentId: true,
    builtVersionId: true,
    name: true,
    increment: true,
    createdAt: true,
  })
    .strip()
    .parse(model);
  const dto: ComponentVersionDto = {
    id: parsed.id,
    releaseComponentId: parsed.releaseComponentId,
    builtVersionId: parsed.builtVersionId,
    name: parsed.name,
    increment: parsed.increment,
    createdAt:
      parsed.createdAt.toISOString() as ComponentVersionDto["createdAt"],
  };
  return ComponentVersionDtoSchema.strip().parse(dto);
}

export function mapToComponentVersionDtos(
  models: unknown[],
): ComponentVersionDto[] {
  return models.map(toComponentVersionDto);
}
