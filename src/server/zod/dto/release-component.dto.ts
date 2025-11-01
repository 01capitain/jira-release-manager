import { z } from "zod";
import {
  ReleaseComponentModelSchema,
  type ReleaseComponentScopeModelSchema,
} from "~/server/zod/schemas/variants/pure/ReleaseComponent.pure";
import { IsoTimestampSchema } from "~/shared/types/iso8601";
import type {
  ReleaseComponentDto,
  ReleaseComponentScope,
} from "~/shared/types/release-component";
import { ReleaseComponentScopes } from "~/shared/types/release-component";
import { UuidV7Schema } from "~/shared/types/uuid";

const ReleaseComponentModelFieldsSchema = ReleaseComponentModelSchema.pick({
  id: true,
  name: true,
  color: true,
  namingPattern: true,
  releaseScope: true,
  createdAt: true,
}).strip();
export const ReleaseComponentDtoSchema = ReleaseComponentModelFieldsSchema.omit(
  {
    id: true,
    createdAt: true,
  },
)
  .extend({
    id: UuidV7Schema,
    releaseScope: z.enum(ReleaseComponentScopes),
    createdAt: IsoTimestampSchema,
  })
  .meta({
    id: "ReleaseComponent",
    title: "Release Component",
    description: "Release component metadata.",
  });

export const ReleaseComponentIdSchema = ReleaseComponentDtoSchema.shape.id;

const ReleaseComponentScopeMap: Record<
  z.infer<typeof ReleaseComponentScopeModelSchema>,
  ReleaseComponentScope
> = {
  version_bound: "version-bound",
  global: "global",
};

export function toReleaseComponentDto(model: unknown): ReleaseComponentDto {
  const parsed = ReleaseComponentModelSchema.pick({
    id: true,
    name: true,
    color: true,
    namingPattern: true,
    releaseScope: true,
    createdAt: true,
  })
    .strip()
    .parse(model);
  const dto: ReleaseComponentDto = {
    id: UuidV7Schema.parse(parsed.id),
    name: parsed.name,
    color: parsed.color,
    namingPattern: parsed.namingPattern,
    releaseScope: ReleaseComponentScopeMap[parsed.releaseScope],
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
