import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { AccountUncheckedCreateNestedManyWithoutUserInputObjectSchema } from "./AccountUncheckedCreateNestedManyWithoutUserInput.schema";
import { SessionUncheckedCreateNestedManyWithoutUserInputObjectSchema } from "./SessionUncheckedCreateNestedManyWithoutUserInput.schema";
import { ReleaseVersionUncheckedCreateNestedManyWithoutCreatedByInputObjectSchema } from "./ReleaseVersionUncheckedCreateNestedManyWithoutCreatedByInput.schema";

const makeSchema = () =>
  z
    .object({
      id: z.string().optional(),
      name: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      emailVerified: z.coerce.date().optional().nullable(),
      image: z.string().optional().nullable(),
      accounts: z.lazy(
        () => AccountUncheckedCreateNestedManyWithoutUserInputObjectSchema,
      ),
      sessions: z.lazy(
        () => SessionUncheckedCreateNestedManyWithoutUserInputObjectSchema,
      ),
      ReleaseVersion: z.lazy(
        () =>
          ReleaseVersionUncheckedCreateNestedManyWithoutCreatedByInputObjectSchema,
      ),
    })
    .strict();
export const UserUncheckedCreateInputObjectSchema: z.ZodType<Prisma.UserUncheckedCreateInput> =
  makeSchema() as unknown as z.ZodType<Prisma.UserUncheckedCreateInput>;
export const UserUncheckedCreateInputObjectZodSchema = makeSchema();
