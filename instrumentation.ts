import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK, type NodeSDKConfiguration } from "@opentelemetry/sdk-node";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

declare global {
  var __otelNodeSdkStarted: boolean | undefined;
}

const getTraceExporter = () => {
  const endpoint =
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return undefined;
  return new OTLPTraceExporter({ url: endpoint });
};

const getMetricReader = () => {
  const endpoint =
    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ??
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return undefined;
  const exporter = new OTLPMetricExporter({ url: endpoint });
  return new PeriodicExportingMetricReader({
    exporter,
    exportIntervalMillis: 30_000,
  });
};

const shouldStart = () => {
  if (typeof process === "undefined") return false;
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== "nodejs") {
    return false;
  }
  if (globalThis.__otelNodeSdkStarted) return false;
  const hasTrace = Boolean(
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  );
  const hasMetrics = Boolean(
    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ??
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  );
  return hasTrace || hasMetrics;
};

export async function register() {
  if (!shouldStart()) {
    return;
  }

  if (process.env.OTEL_DEBUG === "true") {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
  }

  const traceExporter = getTraceExporter();
  const metricReader = getMetricReader();

  const config: Partial<NodeSDKConfiguration> = {
    resource: resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]:
        process.env.OTEL_SERVICE_NAME ?? "jira-release-manager",
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  };

  if (traceExporter) {
    config.traceExporter = traceExporter;
  }
  if (metricReader) {
    config.metricReader = metricReader;
  }

  const sdk = new NodeSDK(config);
  sdk.start();
  globalThis.__otelNodeSdkStarted = true;

  const shutdown = async () => {
    await sdk.shutdown().catch((error) => {
      diag.error("OTel shutdown failed", error);
    });
  };

  process.on("exit", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
  process.on("SIGINT", () => {
    void shutdown();
  });
}
