import type { NextRequest } from "next/server";

import { createRequestContext, type RequestContext } from "~/server/context";

export type RestContext = RequestContext;

export const createRestContext = (req: NextRequest): Promise<RestContext> => {
  return createRequestContext({
    headers: req.headers,
  });
};
