import type { NextRequest } from "next/server";

import { createTRPCContext } from "~/server/api/trpc";

export type RestContext = Awaited<ReturnType<typeof createTRPCContext>>;

export const createRestContext = (req: NextRequest): Promise<RestContext> => {
  return createTRPCContext({
    headers: req.headers,
  });
};
