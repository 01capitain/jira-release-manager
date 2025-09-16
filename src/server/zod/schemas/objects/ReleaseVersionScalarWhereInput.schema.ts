import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { UuidFilterObjectSchema } from "./UuidFilter.schema";
import { StringFilterObjectSchema } from "./StringFilter.schema";
import { DateTimeFilterObjectSchema } from "./DateTimeFilter.schema";

const releaseversionscalarwhereinputSchema = z
  .object({
    AND: z
      .union([
        z.lazy(() => ReleaseVersionScalarWhereInputObjectSchema),
        z.lazy(() => ReleaseVersionScalarWhereInputObjectSchema).array(),
      ])
      .optional(),
    OR: z
      .lazy(() => ReleaseVersionScalarWhereInputObjectSchema)
      .array()
      .optional(),
    NOT: z
      .union([
        z.lazy(() => ReleaseVersionScalarWhereInputObjectSchema),
        z.lazy(() => ReleaseVersionScalarWhereInputObjectSchema).array(),
      ])
      .optional(),
    id: z.union([z.lazy(() => UuidFilterObjectSchema), z.string()]).optional(),
    name: z
      .union([z.lazy(() => StringFilterObjectSchema), z.string()])
      .optional(),
    createdAt: z
      .union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()])
      .optional(),
    updatedAt: z
      .union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()])
      .optional(),
    createdById: z
      .union([z.lazy(() => UuidFilterObjectSchema), z.string()])
      .optional(),
  })
  .strict();
export const ReleaseVersionScalarWhereInputObjectSchema: z.ZodType<Prisma.ReleaseVersionScalarWhereInput> =
  releaseversionscalarwhereinputSchema as unknown as z.ZodType<Prisma.ReleaseVersionScalarWhereInput>;
export const ReleaseVersionScalarWhereInputObjectZodSchema =
  releaseversionscalarwhereinputSchema;
