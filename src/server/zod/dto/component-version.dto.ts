import { z } from "zod";

import { IsoTimestampSchema } from "~/shared/types/iso8601";
import type { ComponentVersionDto } from "~/shared/types/component-version";
import { ComponentVersionModelSchema } from "~/server/zod/schemas/variants/pure/ComponentVersion.pure";

export const ComponentVersionDtoSchema = z
  .object({
    id: z.string(),
    releaseComponentId: z.string(),
    builtVersionId: z.string(),
    name: z.string(),
    increment: z.number().int().min(0),
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
