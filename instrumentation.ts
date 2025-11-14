import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK, type NodeSDKConfiguration } from "@opentelemetry/sdk-node";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

const getPackageVersion = (): string | undefined => {
  const version = process.env.npm_package_version;
  return typeof version === "string" && version.length > 0
    ? version
    : undefined;
};

const resolveServiceInstanceId = async () => {
  if (process.env.SERVICE_INSTANCE_ID) {
    return process.env.SERVICE_INSTANCE_ID;
  }
  if (process.env.HOSTNAME) {
    return process.env.HOSTNAME;
  }
  const generated =
    globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2, 12);
  process.env.SERVICE_INSTANCE_ID = generated;
  return generated;
};

declare global {
  var __otelNodeSdkStarted: boolean | undefined;
}

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

const getTraceExporter = () => {
  const endpoint = withDefaultPath(
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    "/v1/traces",
  );
  if (!endpoint) return undefined;
  return new OTLPTraceExporter({ url: endpoint });
};

const getMetricReader = () => {
  const endpoint = withDefaultPath(
    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ??
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    "/v1/metrics",
  );
  if (!endpoint) return undefined;
  const exporter = new OTLPMetricExporter({ url: endpoint });
  return new PeriodicExportingMetricReader({
    exporter,
    exportIntervalMillis:
      Number(process.env.OTEL_METRIC_EXPORT_INTERVAL) || 60_000,
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

const configureDiagnostics = () => {
  const level =
    process.env.OTEL_DEBUG === "true" ? DiagLogLevel.DEBUG : DiagLogLevel.WARN;
  diag.setLogger(new DiagConsoleLogger(), level);
};

export async function register() {
  if (!shouldStart()) {
    return;
  }

  configureDiagnostics();

  const traceExporter = getTraceExporter();
  const metricReader = getMetricReader();

  const serviceVersion =
    process.env.SERVICE_VERSION ?? getPackageVersion() ?? undefined;
  const deploymentEnvironment =
    process.env.DEPLOYMENT_ENVIRONMENT ?? process.env.NODE_ENV;
  const serviceInstanceId = await resolveServiceInstanceId();

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
    config.metricReaders = [metricReader];
  }

  const sdk = new NodeSDK(config);
  sdk.start();
  globalThis.__otelNodeSdkStarted = true;

  const nodeProcess = globalThis.process;
  if (!nodeProcess || typeof nodeProcess.on !== "function") {
    return;
  }

  let isShuttingDown = false;
  const handleSignal = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    void sdk.shutdown().catch((error) => {
      diag.error("OTel shutdown failed", error);
    });
  };

  if (typeof nodeProcess.once === "function") {
    nodeProcess.once("SIGTERM", handleSignal);
    nodeProcess.once("SIGINT", handleSignal);
  } else {
    nodeProcess.on("SIGTERM", handleSignal);
    nodeProcess.on("SIGINT", handleSignal);
  }
}
