import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { UuidWithAggregatesFilterObjectSchema } from "./UuidWithAggregatesFilter.schema";
import { StringWithAggregatesFilterObjectSchema } from "./StringWithAggregatesFilter.schema";
import { DateTimeWithAggregatesFilterObjectSchema } from "./DateTimeWithAggregatesFilter.schema";

const releaseversionscalarwherewithaggregatesinputSchema = z
  .object({
    AND: z
      .union([
        z.lazy(() => ReleaseVersionScalarWhereWithAggregatesInputObjectSchema),
        z
          .lazy(() => ReleaseVersionScalarWhereWithAggregatesInputObjectSchema)
          .array(),
      ])
      .optional(),
    OR: z
      .lazy(() => ReleaseVersionScalarWhereWithAggregatesInputObjectSchema)
      .array()
      .optional(),
    NOT: z
      .union([
        z.lazy(() => ReleaseVersionScalarWhereWithAggregatesInputObjectSchema),
        z
          .lazy(() => ReleaseVersionScalarWhereWithAggregatesInputObjectSchema)
          .array(),
      ])
      .optional(),
    id: z
      .union([z.lazy(() => UuidWithAggregatesFilterObjectSchema), z.string()])
      .optional(),
    name: z
      .union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()])
      .optional(),
    createdAt: z
      .union([
        z.lazy(() => DateTimeWithAggregatesFilterObjectSchema),
        z.coerce.date(),
      ])
      .optional(),
    updatedAt: z
      .union([
        z.lazy(() => DateTimeWithAggregatesFilterObjectSchema),
        z.coerce.date(),
      ])
      .optional(),
    createdById: z
      .union([z.lazy(() => UuidWithAggregatesFilterObjectSchema), z.string()])
      .optional(),
  })
  .strict();
export const ReleaseVersionScalarWhereWithAggregatesInputObjectSchema: z.ZodType<Prisma.ReleaseVersionScalarWhereWithAggregatesInput> =
  releaseversionscalarwherewithaggregatesinputSchema as unknown as z.ZodType<Prisma.ReleaseVersionScalarWhereWithAggregatesInput>;
export const ReleaseVersionScalarWhereWithAggregatesInputObjectZodSchema =
  releaseversionscalarwherewithaggregatesinputSchema;
