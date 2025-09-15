import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { StringFieldUpdateOperationsInputObjectSchema } from "./StringFieldUpdateOperationsInput.schema";
import { NullableStringFieldUpdateOperationsInputObjectSchema } from "./NullableStringFieldUpdateOperationsInput.schema";
import { NullableDateTimeFieldUpdateOperationsInputObjectSchema } from "./NullableDateTimeFieldUpdateOperationsInput.schema";
import { SessionUpdateManyWithoutUserNestedInputObjectSchema } from "./SessionUpdateManyWithoutUserNestedInput.schema";
import { ReleaseVersionUpdateManyWithoutCreatedByNestedInputObjectSchema } from "./ReleaseVersionUpdateManyWithoutCreatedByNestedInput.schema";

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
        .lazy(() => SessionUpdateManyWithoutUserNestedInputObjectSchema)
        .optional(),
      ReleaseVersion: z
        .lazy(
          () => ReleaseVersionUpdateManyWithoutCreatedByNestedInputObjectSchema,
        )
        .optional(),
    })
    .strict();
export const UserUpdateWithoutAccountsInputObjectSchema: z.ZodType<Prisma.UserUpdateWithoutAccountsInput> =
  makeSchema() as unknown as z.ZodType<Prisma.UserUpdateWithoutAccountsInput>;
export const UserUpdateWithoutAccountsInputObjectZodSchema = makeSchema();
