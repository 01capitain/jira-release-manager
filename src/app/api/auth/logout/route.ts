import { AuthError } from "next-auth";

import { signOut } from "~/server/auth";

export const POST = async (): Promise<Response> => {
  try {
    await signOut({ redirect: false });
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        {
          error: error.type ?? "AUTH_ERROR",
          message: error.message,
        },
        { status: 500 },
      );
    }

    console.error("[auth/logout] unexpected error", error);
    return Response.json(
      { error: "INTERNAL_ERROR", message: "Unexpected logout failure" },
      { status: 500 },
    );
  }
};
