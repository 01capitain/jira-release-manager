import { z } from "zod";

import type { RestContext } from "~/server/rest/context";
import { ensureAuthenticated } from "~/server/rest/auth";
import { jsonErrorResponse } from "~/server/rest/openapi";
import { RestError } from "~/server/rest/errors";

export const UsersMeResponseSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  permissions: z.object({
    releaseVersions: z.object({
      create: z.boolean(),
    }),
    releaseComponents: z.object({
      create: z.boolean(),
    }),
    builtVersions: z.object({
      transition: z.boolean(),
    }),
  }),
});

export const getCurrentUser = (context: RestContext) => {
  if (!context.session?.user) {
    throw new RestError(401, "UNAUTHORIZED", "Authentication required");
  }
  const userId = ensureAuthenticated(context);
  const { name = null, email = null } = context.session.user;
  return UsersMeResponseSchema.parse({
    id: userId,
    name,
    email,
    permissions: {
      releaseVersions: { create: true },
      releaseComponents: { create: true },
      builtVersions: { transition: true },
    },
  });
};

export const userPaths = {
  "/users/me": {
    get: {
      operationId: "getCurrentUser",
      summary: "Get current user",
      tags: ["Users"],
      responses: {
        200: {
          description: "Current user profile",
          content: {
            "application/json": {
              schema: UsersMeResponseSchema,
            },
          },
        },
        401: jsonErrorResponse("Authentication required"),
      },
    },
  },
} as const;
