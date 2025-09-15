import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { UserCreateNestedOneWithoutReleaseVersionInputObjectSchema } from "./UserCreateNestedOneWithoutReleaseVersionInput.schema";

const makeSchema = () =>
  z
    .object({
      id: z.string().optional(),
      name: z.string(),
      createdAt: z.coerce.date().optional(),
      createdBy: z.lazy(
        () => UserCreateNestedOneWithoutReleaseVersionInputObjectSchema,
      ),
    })
    .strict();
export const ReleaseVersionCreateInputObjectSchema: z.ZodType<Prisma.ReleaseVersionCreateInput> =
  makeSchema() as unknown as z.ZodType<Prisma.ReleaseVersionCreateInput>;
export const ReleaseVersionCreateInputObjectZodSchema = makeSchema();
