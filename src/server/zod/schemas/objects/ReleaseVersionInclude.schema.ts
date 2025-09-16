import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { UserArgsObjectSchema } from "./UserArgs.schema";

const makeSchema = () =>
  z
    .object({
      createdBy: z
        .union([z.boolean(), z.lazy(() => UserArgsObjectSchema)])
        .optional(),
    })
    .strict();
export const ReleaseVersionIncludeObjectSchema: z.ZodType<Prisma.ReleaseVersionInclude> =
  makeSchema() as unknown as z.ZodType<Prisma.ReleaseVersionInclude>;
export const ReleaseVersionIncludeObjectZodSchema = makeSchema();
