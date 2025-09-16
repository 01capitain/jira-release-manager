import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { StringFieldUpdateOperationsInputObjectSchema } from "./StringFieldUpdateOperationsInput.schema";
import { NullableStringFieldUpdateOperationsInputObjectSchema } from "./NullableStringFieldUpdateOperationsInput.schema";
import { NullableDateTimeFieldUpdateOperationsInputObjectSchema } from "./NullableDateTimeFieldUpdateOperationsInput.schema";
import { AccountUncheckedUpdateManyWithoutUserNestedInputObjectSchema } from "./AccountUncheckedUpdateManyWithoutUserNestedInput.schema";
import { SessionUncheckedUpdateManyWithoutUserNestedInputObjectSchema } from "./SessionUncheckedUpdateManyWithoutUserNestedInput.schema";

const makeSchema = () =>
  z
    .object({
      id: z
        .union([
          z.string(),
          z.lazy(() => StringFieldUpdateOperationsInputObjectSchema),
        ])
        .optional(),
      name: z
        .union([
          z.string(),
          z.lazy(() => NullableStringFieldUpdateOperationsInputObjectSchema),
        ])
        .optional()
        .nullable(),
      email: z
        .union([
          z.string(),
          z.lazy(() => NullableStringFieldUpdateOperationsInputObjectSchema),
        ])
        .optional()
        .nullable(),
      emailVerified: z
        .union([
          z.coerce.date(),
          z.lazy(() => NullableDateTimeFieldUpdateOperationsInputObjectSchema),
        ])
        .optional()
        .nullable(),
      image: z
        .union([
          z.string(),
          z.lazy(() => NullableStringFieldUpdateOperationsInputObjectSchema),
        ])
        .optional()
        .nullable(),
      accounts: z
        .lazy(
          () => AccountUncheckedUpdateManyWithoutUserNestedInputObjectSchema,
        )
        .optional(),
      sessions: z
        .lazy(
          () => SessionUncheckedUpdateManyWithoutUserNestedInputObjectSchema,
        )
        .optional(),
    })
    .strict();
export const UserUncheckedUpdateWithoutReleaseVersionInputObjectSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutReleaseVersionInput> =
  makeSchema() as unknown as z.ZodType<Prisma.UserUncheckedUpdateWithoutReleaseVersionInput>;
export const UserUncheckedUpdateWithoutReleaseVersionInputObjectZodSchema =
  makeSchema();
