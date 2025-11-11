#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { Socket } from "node:net";
import { resolve } from "node:path";

import { parse as parseDotenv } from "dotenv";

if (process.env.DISABLE_OTEL_HINT === "true") {
  process.exit(0);
}

const color = (text) => `\x1b[94m${text}\x1b[0m`;
const warning = (text) => `\x1b[91m${text}\x1b[0m`;
const success = (text) => `\x1b[92m${text}\x1b[0m`;
const MESSAGE_PREFIX = "   ";
const HEADING_INDENT = "   ";
const BULLET_INDENT = "   - ";

const loadEnvFiles = () => {
  const envFiles = [
    ".env",
    ".env.development",
    ".env.local",
    ".env.development.local",
  ];
  const resolved = new Map();
  for (const filename of envFiles) {
    const filePath = resolve(process.cwd(), filename);
    if (!existsSync(filePath)) continue;
    const raw = readFileSync(filePath, "utf-8");
    const parsed = parseDotenv(raw);
    for (const [key, value] of Object.entries(parsed)) {
      resolved.set(key, value ?? "");
    }
  }
  for (const [key, value] of resolved) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

loadEnvFiles();

const printObservabilityHint = () => {
  const lines = [
    `${HEADING_INDENT}${color("ⓘ Observability Sandbox")}`,
    `${BULLET_INDENT}Grafana:      http://localhost:3001`,
    `${BULLET_INDENT}Docs:         README.md#local-telemetry-sandbox`,
    "",
  ];
  console.log(lines.join("\n"));
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);
const FALLBACK_PROTOCOL_PORTS = {
  "http:": 80,
  "https:": 443,
};

const getTargets = () => {
  const endpoints = [
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  ].filter(
    (value, index, all) => Boolean(value) && all.indexOf(value) === index,
  );

  const targets = new Map();

  for (const endpoint of endpoints) {
    try {
      const url = new URL(endpoint);
      if (!LOCAL_HOSTS.has(url.hostname)) continue;
      const port =
        url.port !== ""
          ? Number(url.port)
          : (FALLBACK_PROTOCOL_PORTS[url.protocol] ?? undefined);
      if (!port) continue;
      targets.set(`${url.hostname}:${port}`, { host: url.hostname, port });
    } catch {
      continue;
    }
  }

  return Array.from(targets.values());
};

const canReach = ({ host, port }) =>
  new Promise((resolve) => {
    const socket = new Socket();
    const finish = (result) => () => {
      socket.destroy();
      resolve(result);
    };

    socket.once("error", finish(false));
    socket.setTimeout(500, finish(false));
    socket.connect(port, host, finish(true));
  });

const runCollectorTest = async () => {
  const targets = getTargets();

  if (targets.length === 0) {
    console.log(
      `${MESSAGE_PREFIX}${success(
        "✓ Skipping OTLP connectivity test (no endpoints configured).",
      )}`,
    );
    console.log("");
    return true;
  }

  const unreachable = [];
  for (const target of targets) {
    const reachable = await canReach(target);
    if (!reachable) {
      unreachable.push(target);
    }
  }

  if (unreachable.length === 0) {
    console.log(
      `${MESSAGE_PREFIX}${success("✓ Local OpenTelemetry collector reachable.")}`,
    );
    console.log("");
    return true;
  }

  const formattedTargets = unreachable
    .map(({ host, port }) => `${host}:${port}`)
    .join(", ");

  console.error(
    `${MESSAGE_PREFIX}${warning(
      `⚠️  Unable to reach the local OpenTelemetry collector (${formattedTargets}).`,
    )}`,
  );
  console.error(
    `${MESSAGE_PREFIX}Start the Jira Release Manager containers before running \`pnpm dev\`.`,
  );
  console.error(
    `${MESSAGE_PREFIX}Use \`./start-database.sh\` or \`docker compose up -d postgres observability\` to boot them.`,
  );
  console.error("");
  return false;
};

const connectivityOk = await runCollectorTest();
printObservabilityHint();
if (!connectivityOk) {
  process.exit(1);
}
