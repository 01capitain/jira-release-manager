import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { SortOrderSchema } from "../enums/SortOrder.schema";

const makeSchema = () =>
  z
    .object({
      _count: SortOrderSchema.optional(),
    })
    .strict();
export const ReleaseVersionOrderByRelationAggregateInputObjectSchema: z.ZodType<Prisma.ReleaseVersionOrderByRelationAggregateInput> =
  makeSchema() as unknown as z.ZodType<Prisma.ReleaseVersionOrderByRelationAggregateInput>;
export const ReleaseVersionOrderByRelationAggregateInputObjectZodSchema =
  makeSchema();
