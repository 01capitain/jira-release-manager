import { AuthError } from "next-auth";
import { z } from "zod";

import { signIn } from "~/server/auth";

const loginSchema = z.object({
  provider: z.literal("discord"),
  returnTo: z
    .string()
    .trim()
    .refine((value) => value.startsWith("/"), {
      message: "returnTo must be a relative path",
    })
    .max(1024)
    .optional(),
});

type LoginRequest = z.infer<typeof loginSchema>;

type ErrorBody = {
  error: string;
  message: string;
};

const BAD_REQUEST: ErrorBody = {
  error: "PROVIDER_UNAVAILABLE",
  message: "Only Discord login is supported",
};

export const POST = async (request: Request): Promise<Response> => {
  let payload: LoginRequest;

  try {
    const json = (await request.json()) as unknown;
    const parsed = loginSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json(BAD_REQUEST, { status: 400 });
    }
    payload = parsed.data;
  } catch {
    return Response.json(
      { error: "INVALID_REQUEST", message: "Malformed JSON body" },
      { status: 400 },
    );
  }

  try {
    const redirectResult = (await signIn("discord", {
      redirect: false,
      redirectTo: payload.returnTo,
    })) as unknown;

    if (
      typeof redirectResult !== "string" ||
      redirectResult.length === 0
    ) {
      return Response.json(
        { error: "INTERNAL_ERROR", message: "Failed to resolve redirect" },
        { status: 500 },
      );
    }

    const redirectUrl = redirectResult;

    return Response.json({ redirectUrl });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.type ?? "AUTH_ERROR", message: error.message },
        { status: 500 },
      );
    }

    console.error("[auth/login] unexpected error", error);
    return Response.json(
      { error: "INTERNAL_ERROR", message: "Unexpected login failure" },
      { status: 500 },
    );
  }
};
