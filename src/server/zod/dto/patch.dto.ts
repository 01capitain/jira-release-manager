import { PatchModelSchema } from "~/server/zod/schemas/variants/pure/Patch.pure";
import type { PatchDto } from "~/shared/types/patch";
import { IsoTimestampSchema } from "~/shared/types/iso8601";
import { PatchStatusSchema } from "~/shared/types/patch-status";
import { UuidV7Schema } from "~/shared/types/uuid";

const PatchModelFieldsSchema = PatchModelSchema.pick({
  id: true,
  name: true,
  versionId: true,
  currentStatus: true,
  createdAt: true,
}).strip();
export const PatchDtoSchema = PatchModelFieldsSchema.omit({
  id: true,
  versionId: true,
  currentStatus: true,
  createdAt: true,
})
  .extend({
    id: UuidV7Schema,
    versionId: UuidV7Schema,
    currentStatus: PatchStatusSchema,
    createdAt: IsoTimestampSchema,
  })
  .meta({
    id: "Patch",
    title: "Patch",
    description: "Patch summary information.",
  });

export const PatchIdSchema = PatchDtoSchema.shape.id;

export function toPatchDto(model: unknown): PatchDto {
  const parsed = PatchModelSchema.pick({
    id: true,
    name: true,
    versionId: true,
    currentStatus: true,
    createdAt: true,
  })
    .strip()
    .parse(model);
  const dto: PatchDto = {
    id: UuidV7Schema.parse(parsed.id),
    name: parsed.name,
    versionId: UuidV7Schema.parse(parsed.versionId),
    currentStatus: PatchStatusSchema.parse(parsed.currentStatus),
    createdAt: parsed.createdAt.toISOString() as PatchDto["createdAt"],
  };
  return PatchDtoSchema.strip().parse(dto);
}

export function mapToPatchDtos(models: unknown[]): PatchDto[] {
  return models.map((m) => toPatchDto(m));
}
