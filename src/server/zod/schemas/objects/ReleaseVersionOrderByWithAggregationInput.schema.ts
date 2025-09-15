import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { SortOrderSchema } from "../enums/SortOrder.schema";
import { ReleaseVersionCountOrderByAggregateInputObjectSchema } from "./ReleaseVersionCountOrderByAggregateInput.schema";
import { ReleaseVersionMaxOrderByAggregateInputObjectSchema } from "./ReleaseVersionMaxOrderByAggregateInput.schema";
import { ReleaseVersionMinOrderByAggregateInputObjectSchema } from "./ReleaseVersionMinOrderByAggregateInput.schema";

const makeSchema = () =>
  z
    .object({
      id: SortOrderSchema.optional(),
      name: SortOrderSchema.optional(),
      createdAt: SortOrderSchema.optional(),
      updatedAt: SortOrderSchema.optional(),
      createdById: SortOrderSchema.optional(),
      _count: z
        .lazy(() => ReleaseVersionCountOrderByAggregateInputObjectSchema)
        .optional(),
      _max: z
        .lazy(() => ReleaseVersionMaxOrderByAggregateInputObjectSchema)
        .optional(),
      _min: z
        .lazy(() => ReleaseVersionMinOrderByAggregateInputObjectSchema)
        .optional(),
    })
    .strict();
export const ReleaseVersionOrderByWithAggregationInputObjectSchema: z.ZodType<Prisma.ReleaseVersionOrderByWithAggregationInput> =
  makeSchema() as unknown as z.ZodType<Prisma.ReleaseVersionOrderByWithAggregationInput>;
export const ReleaseVersionOrderByWithAggregationInputObjectZodSchema =
  makeSchema();
