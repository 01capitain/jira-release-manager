import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { AccountCreateNestedManyWithoutUserInputObjectSchema } from "./AccountCreateNestedManyWithoutUserInput.schema";
import { SessionCreateNestedManyWithoutUserInputObjectSchema } from "./SessionCreateNestedManyWithoutUserInput.schema";

const makeSchema = () =>
  z
    .object({
      id: z.string().optional(),
      name: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      emailVerified: z.coerce.date().optional().nullable(),
      image: z.string().optional().nullable(),
      accounts: z
        .lazy(() => AccountCreateNestedManyWithoutUserInputObjectSchema)
        .optional(),
      sessions: z
        .lazy(() => SessionCreateNestedManyWithoutUserInputObjectSchema)
        .optional(),
    })
    .strict();
type PrismaUserCreateWithoutReleaseVersionsInput =
  Prisma.UserCreateWithoutReleaseVersionsInput;
export const UserCreateWithoutReleaseVersionInputObjectSchema: z.ZodType<PrismaUserCreateWithoutReleaseVersionsInput> =
  makeSchema() as unknown as z.ZodType<PrismaUserCreateWithoutReleaseVersionsInput>;
export const UserCreateWithoutReleaseVersionInputObjectZodSchema = makeSchema();
