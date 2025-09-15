import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { StringFieldUpdateOperationsInputObjectSchema } from "./StringFieldUpdateOperationsInput.schema";
import { NullableStringFieldUpdateOperationsInputObjectSchema } from "./NullableStringFieldUpdateOperationsInput.schema";
import { NullableDateTimeFieldUpdateOperationsInputObjectSchema } from "./NullableDateTimeFieldUpdateOperationsInput.schema";
import { SessionUncheckedUpdateManyWithoutUserNestedInputObjectSchema } from "./SessionUncheckedUpdateManyWithoutUserNestedInput.schema";
import { ReleaseVersionUncheckedUpdateManyWithoutCreatedByNestedInputObjectSchema } from "./ReleaseVersionUncheckedUpdateManyWithoutCreatedByNestedInput.schema";

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
      sessions: z
        .lazy(
          () => SessionUncheckedUpdateManyWithoutUserNestedInputObjectSchema,
        )
        .optional(),
      ReleaseVersion: z
        .lazy(
          () =>
            ReleaseVersionUncheckedUpdateManyWithoutCreatedByNestedInputObjectSchema,
        )
        .optional(),
    })
    .strict();
export const UserUncheckedUpdateWithoutAccountsInputObjectSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutAccountsInput> =
  makeSchema() as unknown as z.ZodType<Prisma.UserUncheckedUpdateWithoutAccountsInput>;
export const UserUncheckedUpdateWithoutAccountsInputObjectZodSchema =
  makeSchema();
