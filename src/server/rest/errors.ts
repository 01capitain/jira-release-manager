import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type RestErrorBody = {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
};

const toDetails = (
  details: unknown,
): Record<string, unknown> | null | undefined => {
  if (details === undefined) return undefined;
  if (details === null) return null;
  if (typeof details === "object" && !Array.isArray(details)) {
    return details as Record<string, unknown>;
  }
  return undefined;
};

export class RestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown> | null;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown> | null,
  ) {
    super(message);
    this.name = "RestError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const mapErrorCode = (code: string): { status: number; restCode: string } => {
  switch (code) {
    case "NOT_FOUND":
    case "P2025":
      return { status: 404, restCode: "NOT_FOUND" };
    case "UNAUTHORIZED":
      return { status: 401, restCode: "UNAUTHORIZED" };
    case "FORBIDDEN":
      return { status: 403, restCode: "FORBIDDEN" };
    case "INVALID_TRANSITION":
    case "VALIDATION_ERROR":
      return { status: 400, restCode: code };
    case "P2002":
      return { status: 409, restCode: "CONFLICT" };
    default:
      return { status: 500, restCode: "INTERNAL_SERVER_ERROR" };
  }
};
export const toRestResponse = (error: unknown): Response => {
  if (error instanceof RestError) {
    return NextResponse.json(
      {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    const normalized = normalizeError(error);
    return NextResponse.json<RestErrorBody>(
      {
        code: normalized.code,
        message: normalized.message,
        ...(normalized.details !== undefined ? { details: normalized.details } : {}),
      },
      { status: normalized.status },
    );
  }
  console.error("[REST] Unhandled error", error);
  return NextResponse.json(
    {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
    { status: 500 },
  );
};

export const normalizeError = (error: unknown): RestError => {
  if (error instanceof RestError) {
    return error;
  }
  if (error instanceof ZodError) {
    return new RestError(400, "VALIDATION_ERROR", "Invalid request payload", {
      issues: error.issues.map((issue) => ({
        code: issue.code,
        path: issue.path,
        message: issue.message,
      })),
    });
  }
  if (
    error instanceof Error &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    const rawCode = (error as { code: string }).code;
    const { status, restCode } = mapErrorCode(rawCode);
    const mapped = toDetails((error as { details?: unknown }).details);
    return new RestError(status, restCode, error.message, mapped ?? undefined);
  }
  return new RestError(500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred");
};
