import { context, propagation, type TextMapSetter } from "@opentelemetry/api";

export type RestApiErrorPayload = {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
};

const headersSetter: TextMapSetter<Headers> = {
  set(carrier, key, value) {
    if (!carrier || typeof carrier.set !== "function" || value === undefined) {
      return;
    }
    carrier.set(key, value);
  },
};

export class RestApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown> | null;

  constructor(params: {
    status: number;
    code: string;
    message: string;
    details?: Record<string, unknown> | null;
  }) {
    super(params.message);
    this.name = "RestApiError";
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
  }
}

export const isRestApiError = (error: unknown): error is RestApiError => {
  return error instanceof RestApiError;
};

const parseRestError = async (response: Response): Promise<RestApiError> => {
  let payload: RestApiErrorPayload | null = null;
  try {
    payload = (await response.json()) as RestApiErrorPayload;
  } catch {
    // ignore JSON parse failures; fall back to status text below
  }
  return new RestApiError({
    status: response.status,
    code: payload?.code ?? "UNKNOWN_ERROR",
    message: payload?.message ?? response.statusText,
    details: payload?.details,
  });
};

export const requestJson = async <TResponse>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<TResponse> => {
  const headers = new Headers({ Accept: "application/json" });

  if (init?.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  propagation.inject(context.active(), headers, headersSetter);

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw await parseRestError(response);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
};

export const postJson = async <TInput, TResponse>(
  url: string,
  body: TInput,
  init?: Omit<RequestInit, "method" | "body">,
): Promise<TResponse> => {
  return requestJson<TResponse>(url, {
    method: "POST",
    body: JSON.stringify(body),
    ...init,
  });
};

export const getJson = async <TResponse>(
  url: string,
  init?: Omit<RequestInit, "method" | "body">,
): Promise<TResponse> => {
  return requestJson<TResponse>(url, {
    method: "GET",
    ...init,
  });
};

export const getListJson = async <TResponse>(
  url: string,
  init?: Omit<RequestInit, "method" | "body">,
): Promise<TResponse[]> => {
  return requestJson<TResponse[]>(url, {
    method: "GET",
    ...init,
  });
};
