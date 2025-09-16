import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { ReleaseVersionCreateWithoutCreatedByInputObjectSchema } from "./ReleaseVersionCreateWithoutCreatedByInput.schema";
import { ReleaseVersionUncheckedCreateWithoutCreatedByInputObjectSchema } from "./ReleaseVersionUncheckedCreateWithoutCreatedByInput.schema";
import { ReleaseVersionCreateOrConnectWithoutCreatedByInputObjectSchema } from "./ReleaseVersionCreateOrConnectWithoutCreatedByInput.schema";
import { ReleaseVersionUpsertWithWhereUniqueWithoutCreatedByInputObjectSchema } from "./ReleaseVersionUpsertWithWhereUniqueWithoutCreatedByInput.schema";
import { ReleaseVersionCreateManyCreatedByInputEnvelopeObjectSchema } from "./ReleaseVersionCreateManyCreatedByInputEnvelope.schema";
import { ReleaseVersionWhereUniqueInputObjectSchema } from "./ReleaseVersionWhereUniqueInput.schema";
import { ReleaseVersionUpdateWithWhereUniqueWithoutCreatedByInputObjectSchema } from "./ReleaseVersionUpdateWithWhereUniqueWithoutCreatedByInput.schema";
import { ReleaseVersionUpdateManyWithWhereWithoutCreatedByInputObjectSchema } from "./ReleaseVersionUpdateManyWithWhereWithoutCreatedByInput.schema";
import { ReleaseVersionScalarWhereInputObjectSchema } from "./ReleaseVersionScalarWhereInput.schema";

const makeSchema = () =>
  z
    .object({
      create: z
        .union([
          z.lazy(() => ReleaseVersionCreateWithoutCreatedByInputObjectSchema),
          z
            .lazy(() => ReleaseVersionCreateWithoutCreatedByInputObjectSchema)
            .array(),
          z.lazy(
            () =>
              ReleaseVersionUncheckedCreateWithoutCreatedByInputObjectSchema,
          ),
          z
            .lazy(
              () =>
                ReleaseVersionUncheckedCreateWithoutCreatedByInputObjectSchema,
            )
            .array(),
        ])
        .optional(),
      connectOrCreate: z
        .union([
          z.lazy(
            () =>
              ReleaseVersionCreateOrConnectWithoutCreatedByInputObjectSchema,
          ),
          z
            .lazy(
              () =>
                ReleaseVersionCreateOrConnectWithoutCreatedByInputObjectSchema,
            )
            .array(),
        ])
        .optional(),
      upsert: z
        .union([
          z.lazy(
            () =>
              ReleaseVersionUpsertWithWhereUniqueWithoutCreatedByInputObjectSchema,
          ),
          z
            .lazy(
              () =>
                ReleaseVersionUpsertWithWhereUniqueWithoutCreatedByInputObjectSchema,
            )
            .array(),
        ])
        .optional(),
      createMany: z
        .lazy(() => ReleaseVersionCreateManyCreatedByInputEnvelopeObjectSchema)
        .optional(),
      set: z
        .union([
          z.lazy(() => ReleaseVersionWhereUniqueInputObjectSchema),
          z.lazy(() => ReleaseVersionWhereUniqueInputObjectSchema).array(),
        ])
        .optional(),
      disconnect: z
        .union([
          z.lazy(() => ReleaseVersionWhereUniqueInputObjectSchema),
          z.lazy(() => ReleaseVersionWhereUniqueInputObjectSchema).array(),
        ])
        .optional(),
      delete: z
        .union([
          z.lazy(() => ReleaseVersionWhereUniqueInputObjectSchema),
          z.lazy(() => ReleaseVersionWhereUniqueInputObjectSchema).array(),
        ])
        .optional(),
      connect: z
        .union([
          z.lazy(() => ReleaseVersionWhereUniqueInputObjectSchema),
          z.lazy(() => ReleaseVersionWhereUniqueInputObjectSchema).array(),
        ])
        .optional(),
      update: z
        .union([
          z.lazy(
            () =>
              ReleaseVersionUpdateWithWhereUniqueWithoutCreatedByInputObjectSchema,
          ),
          z
            .lazy(
              () =>
                ReleaseVersionUpdateWithWhereUniqueWithoutCreatedByInputObjectSchema,
            )
            .array(),
        ])
        .optional(),
      updateMany: z
        .union([
          z.lazy(
            () =>
              ReleaseVersionUpdateManyWithWhereWithoutCreatedByInputObjectSchema,
          ),
          z
            .lazy(
              () =>
                ReleaseVersionUpdateManyWithWhereWithoutCreatedByInputObjectSchema,
            )
            .array(),
        ])
        .optional(),
      deleteMany: z
        .union([
          z.lazy(() => ReleaseVersionScalarWhereInputObjectSchema),
          z.lazy(() => ReleaseVersionScalarWhereInputObjectSchema).array(),
        ])
        .optional(),
    })
    .strict();
export const ReleaseVersionUncheckedUpdateManyWithoutCreatedByNestedInputObjectSchema: z.ZodType<Prisma.ReleaseVersionUncheckedUpdateManyWithoutCreatedByNestedInput> =
  makeSchema() as unknown as z.ZodType<Prisma.ReleaseVersionUncheckedUpdateManyWithoutCreatedByNestedInput>;
export const ReleaseVersionUncheckedUpdateManyWithoutCreatedByNestedInputObjectZodSchema =
  makeSchema();
