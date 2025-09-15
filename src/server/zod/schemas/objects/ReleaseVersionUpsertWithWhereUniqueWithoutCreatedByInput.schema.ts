import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { ReleaseVersionWhereUniqueInputObjectSchema } from "./ReleaseVersionWhereUniqueInput.schema";
import { ReleaseVersionUpdateWithoutCreatedByInputObjectSchema } from "./ReleaseVersionUpdateWithoutCreatedByInput.schema";
import { ReleaseVersionUncheckedUpdateWithoutCreatedByInputObjectSchema } from "./ReleaseVersionUncheckedUpdateWithoutCreatedByInput.schema";
import { ReleaseVersionCreateWithoutCreatedByInputObjectSchema } from "./ReleaseVersionCreateWithoutCreatedByInput.schema";
import { ReleaseVersionUncheckedCreateWithoutCreatedByInputObjectSchema } from "./ReleaseVersionUncheckedCreateWithoutCreatedByInput.schema";

const makeSchema = () =>
  z
    .object({
      where: z.lazy(() => ReleaseVersionWhereUniqueInputObjectSchema),
      update: z.union([
        z.lazy(() => ReleaseVersionUpdateWithoutCreatedByInputObjectSchema),
        z.lazy(
          () => ReleaseVersionUncheckedUpdateWithoutCreatedByInputObjectSchema,
        ),
      ]),
      create: z.union([
        z.lazy(() => ReleaseVersionCreateWithoutCreatedByInputObjectSchema),
        z.lazy(
          () => ReleaseVersionUncheckedCreateWithoutCreatedByInputObjectSchema,
        ),
      ]),
    })
    .strict();
export const ReleaseVersionUpsertWithWhereUniqueWithoutCreatedByInputObjectSchema: z.ZodType<Prisma.ReleaseVersionUpsertWithWhereUniqueWithoutCreatedByInput> =
  makeSchema() as unknown as z.ZodType<Prisma.ReleaseVersionUpsertWithWhereUniqueWithoutCreatedByInput>;
export const ReleaseVersionUpsertWithWhereUniqueWithoutCreatedByInputObjectZodSchema =
  makeSchema();
