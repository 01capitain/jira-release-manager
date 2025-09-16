import { z } from "zod";
import type { Prisma } from "@prisma/client";

const makeSchema = () =>
  z
    .object({
      id: z.string().optional(),
      name: z.string(),
      createdAt: z.coerce.date().optional(),
      updatedAt: z.coerce.date().optional(),
    })
    .strict();
export const ReleaseVersionUncheckedCreateWithoutCreatedByInputObjectSchema: z.ZodType<Prisma.ReleaseVersionUncheckedCreateWithoutCreatedByInput> =
  makeSchema() as unknown as z.ZodType<Prisma.ReleaseVersionUncheckedCreateWithoutCreatedByInput>;
export const ReleaseVersionUncheckedCreateWithoutCreatedByInputObjectZodSchema =
  makeSchema();
