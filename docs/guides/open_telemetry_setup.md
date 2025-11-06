# OpenTelemetry Setup & Usage Guide

This guide explains how to enable OpenTelemetry (OTel) for both the server (Next.js API / server components) and the browser client. It also introduces key OTel concepts so new contributors can reason about telemetry confidently while keeping the system vendor-agnostic.

## 0. OpenTelemetry in 5 Minutes

- **Signals**: OpenTelemetry captures three major telemetry types—**traces** (request lifecycles broken into spans), **metrics** (aggregated numeric time series), and **logs** (not enabled in this project yet). We focus on traces + metrics.
- **Spans & Traces**: A trace is an end-to-end request; each nested unit of work is a span. Spans carry attributes (key/value pairs), timing data, and status. Auto-instrumentations populate spans for framework boundaries; we add manual spans for critical business logic.
- **Meters & Metrics**: Metrics aggregate counters, histograms, and gauges. They’re ideal for tracking rates (e.g., releases per hour) or latency distributions.
- **Resources**: Describe the service emitting telemetry (service name, version, environment). We set these via environment variables so data is identifiable across pipelines.
- **Exporters & OTLP**: Telemetry is exported using the OTLP protocol over HTTP to collectors or vendors (Tempo, Jaeger, Honeycomb, etc.). Keeping exporters OTLP-only ensures portability.
- **Samplers & Processors**: Samplers decide which traces are recorded (default parent-based sample). Processors batch/transform spans or metrics before export. Defaults are sensible; tune only when necessary.
- **Auto Instrumentations**: Pre-built hooks for popular libraries capture telemetry with no extra code, reducing maintenance overhead. Manual instrumentation supplements them when we need domain-specific detail.

## 1. Environment Variables

Edit `.env` (and keep `.env.example` in sync) using the variables below. All values are optional—telemetry only starts when endpoints are provided. See `docs/guides/Add an environment variable.md` for validation details.

```bash
# Service identity
OTEL_SERVICE_NAME=jira-release-manager
NEXT_PUBLIC_OTEL_SERVICE_NAME=jira-release-manager-web

# OTLP endpoints (HTTP exporters)
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://localhost:4318/v1/metrics
# Optional: shared base URL (will be used if specific endpoints are absent)
# OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://localhost:4318/v1/metrics
# Optional: shared base URL for the browser exporter
# NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Optional verbose diagnostics (avoid in production)
OTEL_DEBUG=false
NEXT_PUBLIC_OTEL_DEBUG=false
```

### Running a Local Collector

To test locally, run an OTLP-compatible collector such as the [OpenTelemetry Collector](https://opentelemetry.io/docs/collector/) or [Grafana Alloy](https://grafana.com/oss/opentelemetry/) and point the endpoints above to the collector’s HTTP receiver (default `http://localhost:4318`).

## 2. Server Instrumentation

- The root-level `instrumentation.ts` file starts the Node SDK using `@opentelemetry/sdk-node` automatically when the app boots in a Node.js runtime.
- Traces use OTLP/HTTP exporters; metrics are exported via a periodic reader. If no endpoints are configured the SDK does not start.
- Automatic instrumentations are enabled via `@opentelemetry/auto-instrumentations-node`, covering common libraries (HTTP, fetch, etc.).
- Shutdown hooks flush data gracefully on process exit (`SIGTERM`, `SIGINT`, regular exit).

### Best Practices

- **Scope**: allow auto-instrumentations to cover framework basics; add manual spans only around critical domain operations (e.g., long-running Jira sync).
- **Sampling**: the default parent-based sampler is often sufficient; adjust via environment variables (`OTEL_TRACES_SAMPLER` and related `OTEL_TRACES_SAMPLER_ARG`) if needed.
- **Context propagation**: when adding custom async work ensure context is carried using `context.with` or instrumentation utilities.
- **Error capture**: throw errors normally—instrumentations enrich spans with exception data automatically.

## 3. Browser Instrumentation

- The `TelemetryProvider` (see `src/components/providers/telemetry-provider.tsx`) initializes tracing/metrics once on the client using `@opentelemetry/sdk-trace-web`.
- Collected telemetry flows to the OTLP HTTP endpoints defined by the `NEXT_PUBLIC_OTEL_*` variables.
- A basic `app.page_view` counter metric ships with each navigation; expand with additional counters or histograms as needed.

### Best Practices

- **Span hygiene**: instrument meaningful user interactions (e.g., long-running mutations). Avoid creating spans for every micro-interaction to reduce noise.
- **PII avoidance**: keep attributes coarse-grained—strip or hash user-identifiable data before adding to spans/metrics.
- **Debugging**: enable `NEXT_PUBLIC_OTEL_DEBUG=true` temporarily to verify browser exports in development.

## 4. Verifying Telemetry

1. Start the Collector or telemetry backend.
2. Launch the app with telemetry variables configured.
3. Navigate the UI and hit APIs; confirm spans/metrics arrive via collector logs or backend dashboards.
4. Use [otel-cli](https://github.com/lightstep/otel-cli) or collector debug exporters for smoke checks if needed.

## 5. Extending Telemetry

- Introduce manual instrumentation with `@opentelemetry/api`:

  ```ts
  import { trace } from "@opentelemetry/api";

  const tracer = trace.getTracer("jira-release-manager");
  await tracer.startActiveSpan("release.sync", async (span) => {
    try {
      await syncRelease();
      span.setAttribute("release.count", releases.length);
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
  ```

- Emit domain metrics with the shared MeterProvider (Node or browser) for counters/histograms tied to business KPIs.
- Configure resource attributes (e.g., `SERVICE_VERSION`, deployment environment) via `OTEL_RESOURCE_ATTRIBUTES`.

## 6. Rollout Checklist

- [ ] Populate `.env` with OTEL endpoints and service names.
- [ ] Ensure the collector is reachable from server and browser contexts.
- [ ] Roll out to staging first; confirm telemetry volume and schema alignment with backend expectations.
- [ ] Document dashboards/alerts leveraging the new data.

Following these patterns keeps telemetry configurable, portable across vendors (Tempo, Jaeger, Honeycomb, etc.), and aligned with project conventions.
