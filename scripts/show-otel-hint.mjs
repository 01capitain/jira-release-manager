#!/usr/bin/env node

if (process.env.DISABLE_OTEL_HINT === "true") {
  process.exit(0);
}

const color = (text) => `\x1b[94m${text}\x1b[0m`;
const lines = [
  color(".   ▲ Observability Sandbox"),
  "    - Grafana:      http://localhost:3001",
  "    - Docs:         README.md#local-telemetry-sandbox",
  "",
];

console.log(lines.join("\n"));
