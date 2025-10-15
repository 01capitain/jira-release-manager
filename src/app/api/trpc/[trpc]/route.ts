import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const createContext = async (req: NextRequest): Promise<TRPCContext> => {
  return createTRPCContext({
    headers: req.headers,
  });
};

const handler = (req: NextRequest): Promise<Response> =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }: { path?: string; error: unknown }) => {
            const message =
              error instanceof Error ? error.message : String(error);
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${message}`,
            );
          }
        : undefined,
  }) as Promise<Response>;

export { handler as GET, handler as POST };
