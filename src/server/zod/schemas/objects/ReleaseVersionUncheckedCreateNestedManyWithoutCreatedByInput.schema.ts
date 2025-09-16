import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { ReleaseVersionCreateWithoutCreatedByInputObjectSchema } from "./ReleaseVersionCreateWithoutCreatedByInput.schema";
import { ReleaseVersionUncheckedCreateWithoutCreatedByInputObjectSchema } from "./ReleaseVersionUncheckedCreateWithoutCreatedByInput.schema";
import { ReleaseVersionCreateOrConnectWithoutCreatedByInputObjectSchema } from "./ReleaseVersionCreateOrConnectWithoutCreatedByInput.schema";
import { ReleaseVersionCreateManyCreatedByInputEnvelopeObjectSchema } from "./ReleaseVersionCreateManyCreatedByInputEnvelope.schema";
import { ReleaseVersionWhereUniqueInputObjectSchema } from "./ReleaseVersionWhereUniqueInput.schema";

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
      createMany: z
        .lazy(() => ReleaseVersionCreateManyCreatedByInputEnvelopeObjectSchema)
        .optional(),
      connect: z
        .union([
          z.lazy(() => ReleaseVersionWhereUniqueInputObjectSchema),
          z.lazy(() => ReleaseVersionWhereUniqueInputObjectSchema).array(),
        ])
        .optional(),
    })
    .strict();
export const ReleaseVersionUncheckedCreateNestedManyWithoutCreatedByInputObjectSchema: z.ZodType<Prisma.ReleaseVersionUncheckedCreateNestedManyWithoutCreatedByInput> =
  makeSchema() as unknown as z.ZodType<Prisma.ReleaseVersionUncheckedCreateNestedManyWithoutCreatedByInput>;
export const ReleaseVersionUncheckedCreateNestedManyWithoutCreatedByInputObjectZodSchema =
  makeSchema();
