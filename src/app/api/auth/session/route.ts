import { auth } from "~/server/auth";

export const GET = async (): Promise<Response> => {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ user: null });
  }

  return Response.json({
    user: session.user,
    expires: session.expires,
  });
};
