import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { UserCreateWithoutReleaseVersionInputObjectSchema } from "./UserCreateWithoutReleaseVersionInput.schema";
import { UserUncheckedCreateWithoutReleaseVersionInputObjectSchema } from "./UserUncheckedCreateWithoutReleaseVersionInput.schema";
import { UserCreateOrConnectWithoutReleaseVersionInputObjectSchema } from "./UserCreateOrConnectWithoutReleaseVersionInput.schema";
import { UserWhereUniqueInputObjectSchema } from "./UserWhereUniqueInput.schema";

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
      connect: z.lazy(() => UserWhereUniqueInputObjectSchema).optional(),
    })
    .strict();
export const UserCreateNestedOneWithoutReleaseVersionInputObjectSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutReleaseVersionInput> =
  makeSchema() as unknown as z.ZodType<Prisma.UserCreateNestedOneWithoutReleaseVersionInput>;
export const UserCreateNestedOneWithoutReleaseVersionInputObjectZodSchema =
  makeSchema();
