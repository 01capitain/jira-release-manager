import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { ReleaseVersionCreateManyCreatedByInputObjectSchema } from "./ReleaseVersionCreateManyCreatedByInput.schema";

const makeSchema = () =>
  z
    .object({
      data: z.union([
        z.lazy(() => ReleaseVersionCreateManyCreatedByInputObjectSchema),
        z
          .lazy(() => ReleaseVersionCreateManyCreatedByInputObjectSchema)
          .array(),
      ]),
      skipDuplicates: z.boolean().optional(),
    })
    .strict();
export const ReleaseVersionCreateManyCreatedByInputEnvelopeObjectSchema: z.ZodType<Prisma.ReleaseVersionCreateManyCreatedByInputEnvelope> =
  makeSchema() as unknown as z.ZodType<Prisma.ReleaseVersionCreateManyCreatedByInputEnvelope>;
export const ReleaseVersionCreateManyCreatedByInputEnvelopeObjectZodSchema =
  makeSchema();
