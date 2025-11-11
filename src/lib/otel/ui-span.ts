"use client";

import { SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";

const TRACER_NAME = "jira-release-manager-ui";

export function withUiSpan<T>(
  spanName: string,
  fn: () => Promise<T> | T,
): Promise<T> {
  const tracer = trace.getTracer(TRACER_NAME);
  return tracer.startActiveSpan(spanName, { kind: SpanKind.CLIENT }, (span) => {
    try {
      const result = fn();
      if (result instanceof Promise) {
        return result
          .then((value) => {
            span.setStatus({ code: SpanStatusCode.OK });
            return value;
          })
          .catch((error) => {
            const normalizedError =
              error instanceof Error ? error : new Error(String(error));
            span.recordException(normalizedError);
            span.setStatus({ code: SpanStatusCode.ERROR });
            throw normalizedError;
          })
          .finally(() => span.end());
      }

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return Promise.resolve(result);
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new Error(String(error));
      span.recordException(normalizedError);
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
      return Promise.reject(normalizedError);
    }
  });
}
