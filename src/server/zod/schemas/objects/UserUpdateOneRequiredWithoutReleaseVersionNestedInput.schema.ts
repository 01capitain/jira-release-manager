import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { UserCreateWithoutReleaseVersionInputObjectSchema } from "./UserCreateWithoutReleaseVersionInput.schema";
import { UserUncheckedCreateWithoutReleaseVersionInputObjectSchema } from "./UserUncheckedCreateWithoutReleaseVersionInput.schema";
import { UserCreateOrConnectWithoutReleaseVersionInputObjectSchema } from "./UserCreateOrConnectWithoutReleaseVersionInput.schema";
import { UserUpsertWithoutReleaseVersionInputObjectSchema } from "./UserUpsertWithoutReleaseVersionInput.schema";
import { UserWhereUniqueInputObjectSchema } from "./UserWhereUniqueInput.schema";
import { UserUpdateToOneWithWhereWithoutReleaseVersionInputObjectSchema } from "./UserUpdateToOneWithWhereWithoutReleaseVersionInput.schema";
import { UserUpdateWithoutReleaseVersionInputObjectSchema } from "./UserUpdateWithoutReleaseVersionInput.schema";
import { UserUncheckedUpdateWithoutReleaseVersionInputObjectSchema } from "./UserUncheckedUpdateWithoutReleaseVersionInput.schema";

const makeSchema = () =>
  z
    .object({
      create: z
        .union([
          z.lazy(() => UserCreateWithoutReleaseVersionInputObjectSchema),
          z.lazy(
            () => UserUncheckedCreateWithoutReleaseVersionInputObjectSchema,
          ),
        ])
        .optional(),
      connectOrCreate: z
        .lazy(() => UserCreateOrConnectWithoutReleaseVersionInputObjectSchema)
        .optional(),
      upsert: z
        .lazy(() => UserUpsertWithoutReleaseVersionInputObjectSchema)
        .optional(),
      connect: z.lazy(() => UserWhereUniqueInputObjectSchema).optional(),
      update: z
        .union([
          z.lazy(
            () =>
              UserUpdateToOneWithWhereWithoutReleaseVersionInputObjectSchema,
          ),
          z.lazy(() => UserUpdateWithoutReleaseVersionInputObjectSchema),
          z.lazy(
            () => UserUncheckedUpdateWithoutReleaseVersionInputObjectSchema,
          ),
        ])
        .optional(),
    })
    .strict();
export const UserUpdateOneRequiredWithoutReleaseVersionNestedInputObjectSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutReleaseVersionNestedInput> =
  makeSchema() as unknown as z.ZodType<Prisma.UserUpdateOneRequiredWithoutReleaseVersionNestedInput>;
export const UserUpdateOneRequiredWithoutReleaseVersionNestedInputObjectZodSchema =
  makeSchema();
