import { z } from "zod";
export const ReleaseVersionAggregateResultSchema = z.object({
  _count: z
    .object({
      id: z.number(),
      name: z.number(),
      createdAt: z.number(),
      updatedAt: z.number(),
      createdBy: z.number(),
      createdById: z.number(),
    })
    .optional(),
  _min: z
    .object({
      id: z.string().nullable(),
      name: z.string().nullable(),
      createdAt: z.date().nullable(),
      updatedAt: z.date().nullable(),
      createdById: z.string().nullable(),
    })
    .nullable()
    .optional(),
  _max: z
    .object({
      id: z.string().nullable(),
      name: z.string().nullable(),
      createdAt: z.date().nullable(),
      updatedAt: z.date().nullable(),
      createdById: z.string().nullable(),
    })
    .nullable()
    .optional(),
});
