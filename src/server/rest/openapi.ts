import { z } from "zod";

import { toRestJsonSchema } from "~/shared/zod/json-schema";

const RestErrorDetailsSchema = z.unknown().meta({
  id: "RestErrorDetails",
  title: "REST Error Details",
  description: "Arbitrary structured data providing additional error context.",
});

export const RestErrorSchema = z
  .object({
    code: z.string(),
    message: z.string(),
    details: RestErrorDetailsSchema.nullable().optional(),
  })
  .meta({
    id: "RestError",
    title: "REST Error",
    description: "Standard envelope for REST error responses.",
    examples: [
      {
        code: "VALIDATION_ERROR",
        message: "Invalid request payload",
        details: { field: "name" },
      },
    ],
  });

export const getRestErrorJsonSchema = () => toRestJsonSchema(RestErrorSchema);

export const jsonErrorResponse = (description: string) => ({
  description,
  content: {
    "application/json": {
      schema: RestErrorSchema,
    },
  },
});
