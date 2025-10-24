import { BuiltVersionModelSchema } from "~/server/zod/schemas/variants/pure/BuiltVersion.pure";
import type { BuiltVersionDto } from "~/shared/types/built-version";
import { IsoTimestampSchema } from "~/shared/types/iso8601";

const BuiltVersionModelFieldsSchema = BuiltVersionModelSchema.pick({
  id: true,
  name: true,
  versionId: true,
  createdAt: true,
}).strip();
export const BuiltVersionDtoSchema = BuiltVersionModelFieldsSchema.omit({
  createdAt: true,
})
  .extend({ createdAt: IsoTimestampSchema })
  .meta({
    id: "BuiltVersion",
    title: "Built Version",
    description: "Built version summary information.",
  });

export function toBuiltVersionDto(model: unknown): BuiltVersionDto {
  const parsed = BuiltVersionModelSchema.pick({
    id: true,
    name: true,
    versionId: true,
    createdAt: true,
  })
    .strip()
    .parse(model);
  const dto: BuiltVersionDto = {
    id: parsed.id,
    name: parsed.name,
    versionId: parsed.versionId,
    createdAt: parsed.createdAt.toISOString() as BuiltVersionDto["createdAt"],
  };
  return BuiltVersionDtoSchema.strip().parse(dto);
}

export function mapToBuiltVersionDtos(models: unknown[]): BuiltVersionDto[] {
  return models.map((m) => toBuiltVersionDto(m));
}
