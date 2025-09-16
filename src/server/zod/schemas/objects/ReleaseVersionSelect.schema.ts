import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { UserArgsObjectSchema } from "./UserArgs.schema";

const makeSchema = () =>
  z
    .object({
      id: z.boolean().optional(),
      name: z.boolean().optional(),
      createdAt: z.boolean().optional(),
      updatedAt: z.boolean().optional(),
      createdBy: z
        .union([z.boolean(), z.lazy(() => UserArgsObjectSchema)])
        .optional(),
      createdById: z.boolean().optional(),
    })
    .strict();
export const ReleaseVersionSelectObjectSchema: z.ZodType<Prisma.ReleaseVersionSelect> =
  makeSchema() as unknown as z.ZodType<Prisma.ReleaseVersionSelect>;
export const ReleaseVersionSelectObjectZodSchema = makeSchema();
