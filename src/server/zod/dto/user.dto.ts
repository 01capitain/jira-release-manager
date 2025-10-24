import { z } from "zod";

import type { UserSummaryDto } from "~/shared/types/user";
import { UserModelSchema } from "~/server/zod/schemas/variants/pure/User.pure";
import { UuidV7Schema } from "~/shared/types/uuid";

export const UserSummaryDtoSchema = z
  .object({
    id: UuidV7Schema,
    name: z.string().nullable(),
    email: z.string().nullable(),
  })
  .meta({
    id: "User",
    title: "User",
    description: "Basic user summary details.",
  });

export const UserIdSchema = UserSummaryDtoSchema.shape.id;

export function toUserSummaryDto(model: unknown): UserSummaryDto {
  const parsed = UserModelSchema.pick({
    id: true,
    name: true,
    email: true,
  })
    .strip()
    .parse(model);
  const dto: UserSummaryDto = {
    id: parsed.id,
    name: parsed.name ?? null,
    email: parsed.email ?? null,
  };
  return UserSummaryDtoSchema.strip().parse(dto);
}
