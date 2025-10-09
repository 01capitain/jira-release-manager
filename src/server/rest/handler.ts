import { NextResponse, type NextRequest } from "next/server";
import { type z } from "zod";

import { createRestContext, type RestContext } from "~/server/rest/context";
import {
  RestError,
  normalizeError,
  toRestResponse,
} from "~/server/rest/errors";

export type RouteParams = Record<string, string>;

const normalizeParams = (
  params: Record<string, string | string[]> | undefined,
): RouteParams => {
  if (!params) return {};
  return Object.entries(params).reduce<RouteParams>((acc, [key, value]) => {
    acc[key] = Array.isArray(value) ? (value[0] ?? "") : value;
    return acc;
  }, {});
};

type RestHandlerArgs = {
  req: NextRequest;
  context: RestContext;
  params: RouteParams;
};

type RestHandler = (args: RestHandlerArgs) => Promise<Response>;

export const createRestHandler = (handler: RestHandler) => {
  return async (
    req: NextRequest,
    context: { params?: Record<string, string | string[]> },
  ) => {
    try {
      const restContext = await createRestContext(req);
      return await handler({
        req,
        context: restContext,
        params: normalizeParams(context.params),
      });
    } catch (error: unknown) {
      return toRestResponse(normalizeError(error));
    }
  };
};

export const parseJsonBody = async <T extends z.ZodTypeAny>(
  req: NextRequest,
  schema: T,
): Promise<z.infer<T>> => {
  const MAX_BODY_SIZE = 1024 * 1024; // 1MB
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    throw new RestError(
      413,
      "PAYLOAD_TOO_LARGE",
      "Request body exceeds size limit",
    );
  }

  let data: unknown;
  try {
    data = await req.json();
  } catch {
    throw new RestError(400, "INVALID_JSON", "Request body must be valid JSON");
  }
  return schema.parse(data);
};

export const parseSearchParams = <T extends z.ZodTypeAny>(
  req: NextRequest,
  schema: T,
): z.infer<T> => {
  const entries = Object.fromEntries(req.nextUrl.searchParams.entries());
  return schema.parse(entries);
};

export const jsonResponse = <T>(body: T, init?: ResponseInit): Response => {
  return NextResponse.json(body, init);
};

export { ensureAuthenticated } from "./auth";
