import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { UserWhereUniqueInputObjectSchema } from "./UserWhereUniqueInput.schema";
import { UserCreateWithoutReleaseVersionInputObjectSchema } from "./UserCreateWithoutReleaseVersionInput.schema";
import { UserUncheckedCreateWithoutReleaseVersionInputObjectSchema } from "./UserUncheckedCreateWithoutReleaseVersionInput.schema";

const makeSchema = () =>
  z
    .object({
      where: z.lazy(() => UserWhereUniqueInputObjectSchema),
      create: z.union([
        z.lazy(() => UserCreateWithoutReleaseVersionInputObjectSchema),
        z.lazy(() => UserUncheckedCreateWithoutReleaseVersionInputObjectSchema),
      ]),
    })
    .strict();
type PrismaUserCreateOrConnectWithoutReleaseVersionsInput =
  Prisma.UserCreateOrConnectWithoutReleaseVersionsInput;
export const UserCreateOrConnectWithoutReleaseVersionInputObjectSchema: z.ZodType<PrismaUserCreateOrConnectWithoutReleaseVersionsInput> =
  makeSchema() as unknown as z.ZodType<PrismaUserCreateOrConnectWithoutReleaseVersionsInput>;
export const UserCreateOrConnectWithoutReleaseVersionInputObjectZodSchema =
  makeSchema();
