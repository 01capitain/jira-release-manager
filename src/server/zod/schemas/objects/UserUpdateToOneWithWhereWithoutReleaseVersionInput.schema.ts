import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { UserWhereInputObjectSchema } from "./UserWhereInput.schema";
import { UserUpdateWithoutReleaseVersionInputObjectSchema } from "./UserUpdateWithoutReleaseVersionInput.schema";
import { UserUncheckedUpdateWithoutReleaseVersionInputObjectSchema } from "./UserUncheckedUpdateWithoutReleaseVersionInput.schema";

const makeSchema = () =>
  z
    .object({
      where: z.lazy(() => UserWhereInputObjectSchema).optional(),
      data: z.union([
        z.lazy(() => UserUpdateWithoutReleaseVersionInputObjectSchema),
        z.lazy(() => UserUncheckedUpdateWithoutReleaseVersionInputObjectSchema),
      ]),
    })
    .strict();
type PrismaUserUpdateToOneWithWhereWithoutReleaseVersionsInput =
  Prisma.UserUpdateToOneWithWhereWithoutReleaseVersionsInput;
export const UserUpdateToOneWithWhereWithoutReleaseVersionInputObjectSchema: z.ZodType<PrismaUserUpdateToOneWithWhereWithoutReleaseVersionsInput> =
  makeSchema() as unknown as z.ZodType<PrismaUserUpdateToOneWithWhereWithoutReleaseVersionsInput>;
export const UserUpdateToOneWithWhereWithoutReleaseVersionInputObjectZodSchema =
  makeSchema();
