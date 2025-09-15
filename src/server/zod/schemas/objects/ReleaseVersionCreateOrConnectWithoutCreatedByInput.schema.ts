import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { ReleaseVersionWhereUniqueInputObjectSchema } from "./ReleaseVersionWhereUniqueInput.schema";
import { ReleaseVersionCreateWithoutCreatedByInputObjectSchema } from "./ReleaseVersionCreateWithoutCreatedByInput.schema";
import { ReleaseVersionUncheckedCreateWithoutCreatedByInputObjectSchema } from "./ReleaseVersionUncheckedCreateWithoutCreatedByInput.schema";

const makeSchema = () =>
  z
    .object({
      where: z.lazy(() => ReleaseVersionWhereUniqueInputObjectSchema),
      create: z.union([
        z.lazy(() => ReleaseVersionCreateWithoutCreatedByInputObjectSchema),
        z.lazy(
          () => ReleaseVersionUncheckedCreateWithoutCreatedByInputObjectSchema,
        ),
      ]),
    })
    .strict();
export const ReleaseVersionCreateOrConnectWithoutCreatedByInputObjectSchema: z.ZodType<Prisma.ReleaseVersionCreateOrConnectWithoutCreatedByInput> =
  makeSchema() as unknown as z.ZodType<Prisma.ReleaseVersionCreateOrConnectWithoutCreatedByInput>;
export const ReleaseVersionCreateOrConnectWithoutCreatedByInputObjectZodSchema =
  makeSchema();
