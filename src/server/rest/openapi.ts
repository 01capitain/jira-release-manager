import { z } from "zod";

const RestErrorDetailsSchema = z.object({}).catchall(z.unknown());

export const RestErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: RestErrorDetailsSchema.nullable().optional(),
});

export const jsonErrorResponse = (description: string) => ({
  description,
  content: {
    "application/json": {
      schema: RestErrorSchema,
    },
  },
});
