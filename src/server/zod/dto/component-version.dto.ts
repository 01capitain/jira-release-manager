import { ComponentVersionModelSchema } from "~/server/zod/schemas/variants/pure/ComponentVersion.pure";
import { PatchIdSchema } from "~/server/zod/dto/patch.dto";
import { ReleaseComponentIdSchema } from "~/server/zod/dto/release-component.dto";
import type { ComponentVersionDto } from "~/shared/types/component-version";
import { IsoTimestampSchema } from "~/shared/types/iso8601";
import { UuidV7Schema } from "~/shared/types/uuid";

const ComponentVersionModelFieldsSchema = ComponentVersionModelSchema.pick({
  id: true,
  releaseComponentId: true,
  patchId: true,
  name: true,
  increment: true,
  createdAt: true,
}).strip();
export const ComponentVersionDtoSchema = ComponentVersionModelFieldsSchema.omit(
  {
    id: true,
    releaseComponentId: true,
    patchId: true,
    createdAt: true,
  },
)
  .extend({
    id: UuidV7Schema,
    releaseComponentId: ReleaseComponentIdSchema,
    patchId: PatchIdSchema,
    createdAt: IsoTimestampSchema,
  })
  .meta({
    id: "ComponentVersion",
    title: "Component Version",
    description: "Component version details deployed with a patch.",
  });

export function toComponentVersionDto(model: unknown): ComponentVersionDto {
  const parsed = ComponentVersionModelSchema.pick({
    id: true,
    releaseComponentId: true,
    patchId: true,
    name: true,
    increment: true,
    createdAt: true,
  })
    .strip()
    .parse(model);
  const dto: ComponentVersionDto = {
    id: UuidV7Schema.parse(parsed.id),
    releaseComponentId: ReleaseComponentIdSchema.parse(
      parsed.releaseComponentId,
    ),
    patchId: PatchIdSchema.parse(parsed.patchId),
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
