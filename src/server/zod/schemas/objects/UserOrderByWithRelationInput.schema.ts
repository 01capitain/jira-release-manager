import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { SortOrderSchema } from "../enums/SortOrder.schema";
import { SortOrderInputObjectSchema } from "./SortOrderInput.schema";
import { AccountOrderByRelationAggregateInputObjectSchema } from "./AccountOrderByRelationAggregateInput.schema";
import { SessionOrderByRelationAggregateInputObjectSchema } from "./SessionOrderByRelationAggregateInput.schema";
import { ReleaseVersionOrderByRelationAggregateInputObjectSchema } from "./ReleaseVersionOrderByRelationAggregateInput.schema";

const makeSchema = () =>
  z
    .object({
      id: SortOrderSchema.optional(),
      name: z
        .union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)])
        .optional(),
      email: z
        .union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)])
        .optional(),
      emailVerified: z
        .union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)])
        .optional(),
      image: z
        .union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)])
        .optional(),
      accounts: z
        .lazy(() => AccountOrderByRelationAggregateInputObjectSchema)
        .optional(),
      sessions: z
        .lazy(() => SessionOrderByRelationAggregateInputObjectSchema)
        .optional(),
      ReleaseVersion: z
        .lazy(() => ReleaseVersionOrderByRelationAggregateInputObjectSchema)
        .optional(),
    })
    .strict();
export const UserOrderByWithRelationInputObjectSchema: z.ZodType<Prisma.UserOrderByWithRelationInput> =
  makeSchema() as unknown as z.ZodType<Prisma.UserOrderByWithRelationInput>;
export const UserOrderByWithRelationInputObjectZodSchema = makeSchema();
