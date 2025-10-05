import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { AccountUncheckedCreateNestedManyWithoutUserInputObjectSchema } from "./AccountUncheckedCreateNestedManyWithoutUserInput.schema";
import { SessionUncheckedCreateNestedManyWithoutUserInputObjectSchema } from "./SessionUncheckedCreateNestedManyWithoutUserInput.schema";

const makeSchema = () =>
  z
    .object({
      id: z.string().optional(),
      name: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      emailVerified: z.coerce.date().optional().nullable(),
      image: z.string().optional().nullable(),
      accounts: z
        .lazy(
          () => AccountUncheckedCreateNestedManyWithoutUserInputObjectSchema,
        )
        .optional(),
      sessions: z
        .lazy(
          () => SessionUncheckedCreateNestedManyWithoutUserInputObjectSchema,
        )
        .optional(),
    })
    .strict();
type PrismaUserUncheckedCreateWithoutReleaseVersionsInput =
  Prisma.UserUncheckedCreateWithoutReleaseVersionsInput;
export const UserUncheckedCreateWithoutReleaseVersionInputObjectSchema: z.ZodType<PrismaUserUncheckedCreateWithoutReleaseVersionsInput> =
  makeSchema() as unknown as z.ZodType<PrismaUserUncheckedCreateWithoutReleaseVersionsInput>;
export const UserUncheckedCreateWithoutReleaseVersionInputObjectZodSchema =
  makeSchema();
