import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK, type NodeSDKConfiguration } from "@opentelemetry/sdk-node";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const packageJsonUrl = new URL("./package.json", import.meta.url);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getPackageVersion = (): string | undefined => {
  try {
    const raw = readFileSync(packageJsonUrl, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return undefined;
    }
    const version = parsed.version;
    return typeof version === "string" ? version : undefined;
  } catch {
    return undefined;
  }
};

const resolveServiceInstanceId = () => {
  if (process.env.SERVICE_INSTANCE_ID) {
    return process.env.SERVICE_INSTANCE_ID;
  }
  if (process.env.HOSTNAME) {
    return process.env.HOSTNAME;
  }
  const generated = randomUUID();
  process.env.SERVICE_INSTANCE_ID = generated;
  return generated;
};

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
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  }

  const traceExporter = getTraceExporter();
  const metricReader = getMetricReader();

  const serviceVersion =
    process.env.SERVICE_VERSION ?? getPackageVersion() ?? undefined;
  const deploymentEnvironment =
    process.env.DEPLOYMENT_ENVIRONMENT ?? process.env.NODE_ENV;
  const serviceInstanceId = resolveServiceInstanceId();

  const resourceAttributes: Record<string, string> = {
    [SemanticResourceAttributes.SERVICE_NAME]:
      process.env.OTEL_SERVICE_NAME ?? "jira-release-manager",
    [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: serviceInstanceId,
  };

  if (serviceVersion) {
    resourceAttributes[SemanticResourceAttributes.SERVICE_VERSION] =
      serviceVersion;
  }
  if (deploymentEnvironment) {
    resourceAttributes[SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT] =
      deploymentEnvironment;
  }

  const config: Partial<NodeSDKConfiguration> = {
    resource: resourceFromAttributes(resourceAttributes),
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

  const shutdown = () => sdk.shutdown();

  const handleSignal = () => {
    void (async () => {
      try {
        await shutdown();
        process.exit(0);
      } catch (error) {
        diag.error("OTel shutdown failed", error);
        process.exit(1);
      }
    })();
  };

  process.on("SIGTERM", handleSignal);
  process.on("SIGINT", handleSignal);
}
