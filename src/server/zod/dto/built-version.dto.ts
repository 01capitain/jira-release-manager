import { z } from "zod";
import { IsoTimestampSchema } from "~/shared/types/iso8601";
import type { BuiltVersionDto } from "~/shared/types/built-version";
import { BuiltVersionModelSchema } from "~/server/zod/schemas/variants/pure/BuiltVersion.pure";

export const BuiltVersionDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  versionId: z.string(),
  createdAt: IsoTimestampSchema,
});

export function toBuiltVersionDto(model: unknown): BuiltVersionDto {
  const parsed = BuiltVersionModelSchema.pick({
    id: true,
    name: true,
    versionId: true,
    createdAt: true,
  }).parse(model);
  const dto: BuiltVersionDto = {
    id: parsed.id,
    name: parsed.name,
    versionId: parsed.versionId,
    createdAt: parsed.createdAt.toISOString() as BuiltVersionDto["createdAt"],
  };
  return BuiltVersionDtoSchema.parse(dto);
}

export function mapToBuiltVersionDtos(models: unknown[]): BuiltVersionDto[] {
  return models.map((m) => toBuiltVersionDto(m));
}
