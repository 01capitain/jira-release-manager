import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { AccountUncheckedCreateNestedManyWithoutUserInputObjectSchema } from "./AccountUncheckedCreateNestedManyWithoutUserInput.schema";
import { ReleaseVersionUncheckedCreateNestedManyWithoutCreatedByInputObjectSchema } from "./ReleaseVersionUncheckedCreateNestedManyWithoutCreatedByInput.schema";

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
      ReleaseVersion: z
        .lazy(
          () =>
            ReleaseVersionUncheckedCreateNestedManyWithoutCreatedByInputObjectSchema,
        )
        .optional(),
    })
    .strict();
export const UserUncheckedCreateWithoutSessionsInputObjectSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutSessionsInput> =
  makeSchema() as unknown as z.ZodType<Prisma.UserUncheckedCreateWithoutSessionsInput>;
export const UserUncheckedCreateWithoutSessionsInputObjectZodSchema =
  makeSchema();
