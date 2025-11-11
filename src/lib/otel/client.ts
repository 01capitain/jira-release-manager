"use client";

import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { getWebAutoInstrumentations } from "@opentelemetry/auto-instrumentations-web";
import { ZoneContextManager } from "@opentelemetry/context-zone-peer-dep";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  PeriodicExportingMetricReader,
  MeterProvider,
} from "@opentelemetry/sdk-metrics";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

let initialized = false;

const withDefaultPath = (endpoint: string | undefined, defaultPath: string) => {
  if (!endpoint) return undefined;
  try {
    const url = new URL(endpoint);
    if (url.pathname === "" || url.pathname === "/") {
      url.pathname = defaultPath;
    }
    return url.toString();
  } catch {
    const normalizedDefault = defaultPath.startsWith("/")
      ? defaultPath
      : `/${defaultPath}`;
    const trimmed = endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
    if (trimmed.endsWith(normalizedDefault)) {
      return trimmed;
    }
    return `${trimmed}${normalizedDefault}`;
  }
};

const getTraceEndpoint = () =>
  withDefaultPath(
    process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
      process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT,
    "/v1/traces",
  );

const getMetricsEndpoint = () =>
  withDefaultPath(
    process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ??
      process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT,
    "/v1/metrics",
  );

export const initializeClientTelemetry = () => {
  if (initialized || typeof window === "undefined") return;

  const traceEndpoint = getTraceEndpoint();
  const metricsEndpoint = getMetricsEndpoint();
  if (!traceEndpoint && !metricsEndpoint) {
    initialized = true;
    return;
  }

  if (process.env.NEXT_PUBLIC_OTEL_DEBUG === "true") {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
  } else {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);
  }

  const resource = resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]:
      process.env.NEXT_PUBLIC_OTEL_SERVICE_NAME ?? "jira-release-manager-web",
  });

  if (traceEndpoint) {
    const exporter = new OTLPTraceExporter({ url: traceEndpoint });
    const tracerProvider = new WebTracerProvider({
      resource,
      spanProcessors: [new BatchSpanProcessor(exporter)],
    });
    tracerProvider.register({ contextManager: new ZoneContextManager() });

    registerInstrumentations({
      tracerProvider,
      instrumentations: [
        getWebAutoInstrumentations({
          "@opentelemetry/instrumentation-fetch": {
            propagateTraceHeaderCorsUrls: [/^(?!chrome-extension:\/\/).*/],
            clearTimingResources: true,
          },
        }),
      ],
    });
  }

  if (metricsEndpoint) {
    const metricExporter = new OTLPMetricExporter({ url: metricsEndpoint });
    const meterProvider = new MeterProvider({
      resource,
      readers: [
        new PeriodicExportingMetricReader({
          exporter: metricExporter,
          exportIntervalMillis: 60_000,
        }),
      ],
    });
    const meter = meterProvider.getMeter("jira-release-manager-web");
    const pageView = meter.createCounter("app.page_view");
    pageView.add(1, {
      path: window.location.pathname,
    });
  }

  initialized = true;
};
