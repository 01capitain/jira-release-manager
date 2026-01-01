import { createEnv } from "@t3-oss/env-nextjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const serverSchema = {
  AUTH_SECRET:
    process.env.NODE_ENV === "production" ? z.string() : z.string().optional(),
  AUTH_DISCORD_ID: z.string(),
  AUTH_DISCORD_SECRET: z.string(),
  DATABASE_URL: z.string().url(),
  DB_PORT: z.coerce.number().int().optional(),
  CONTEXT7_API_KEY: z.string(),
  // Jira integration
  JIRA_BASE_URL: z.string().url().optional(),
  JIRA_PROJECT_KEY: z.string().optional(),
  NEXTAUTH_URL:
    process.env.NODE_ENV === "production"
      ? z.string().url()
      : z.string().url().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]),
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: z.string().url().optional(),
  OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: z.string().url().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_SERVICE_NAME: z.string().optional(),
  OTEL_DEBUG: z.enum(["true", "false"]).optional(),
  GRAFANA_ADMIN_USER: z.string().optional(),
  GRAFANA_ADMIN_PASSWORD: z.string().optional(),
};

const clientSchema = {
  NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: z.string().url().optional(),
  NEXT_PUBLIC_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: z.string().url().optional(),
  NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  NEXT_PUBLIC_OTEL_SERVICE_NAME: z.string().optional(),
  NEXT_PUBLIC_OTEL_DEBUG: z.enum(["true", "false"]).optional(),
};

/**
 * @param {string | undefined} databaseUrl
 */
const parseDbPort = (databaseUrl) => {
  if (!databaseUrl) return undefined;
  try {
    const parsed = new URL(databaseUrl);
    return parsed.port || "5432";
  } catch {
    return undefined;
  }
};

const deriveDbPort = () => {
  const fromUrl = parseDbPort(process.env.DATABASE_URL);
  const explicit = process.env.DB_PORT;
  if (explicit && fromUrl && explicit !== fromUrl) {
    throw new Error(
      `DB_PORT (${explicit}) does not match port parsed from DATABASE_URL (${fromUrl}). Align both to avoid pointing Postgres at the wrong port.`,
    );
  }
  return explicit ?? fromUrl;
};

const resolvedDbPort = deriveDbPort();

const runtimeEnv = {
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_DISCORD_ID: process.env.AUTH_DISCORD_ID,
  AUTH_DISCORD_SECRET: process.env.AUTH_DISCORD_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  DB_PORT: resolvedDbPort,
  CONTEXT7_API_KEY: process.env.CONTEXT7_API_KEY,
  JIRA_BASE_URL: process.env.JIRA_BASE_URL,
  JIRA_PROJECT_KEY: process.env.JIRA_PROJECT_KEY,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NODE_ENV: process.env.NODE_ENV,
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT:
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
  OTEL_EXPORTER_OTLP_METRICS_ENDPOINT:
    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  OTEL_SERVICE_NAME: process.env.OTEL_SERVICE_NAME,
  OTEL_DEBUG: process.env.OTEL_DEBUG,
  NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT:
    process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
  NEXT_PUBLIC_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT:
    process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
  NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT:
    process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT,
  NEXT_PUBLIC_OTEL_SERVICE_NAME: process.env.NEXT_PUBLIC_OTEL_SERVICE_NAME,
  NEXT_PUBLIC_OTEL_DEBUG: process.env.NEXT_PUBLIC_OTEL_DEBUG,
  GRAFANA_ADMIN_USER: process.env.GRAFANA_ADMIN_USER,
  GRAFANA_ADMIN_PASSWORD: process.env.GRAFANA_ADMIN_PASSWORD,
};

const parseEnvExampleKeys = () => {
  if (typeof window !== "undefined" || process.env.SKIP_ENV_VALIDATION) {
    return [];
  }

  const examplePath = join(process.cwd(), ".env.example");
  let exampleFile;
  try {
    exampleFile = readFileSync(examplePath, "utf-8");
  } catch {
    return [];
  }
  return exampleFile
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .flatMap((line) => {
      const match = line.match(/^([A-Z][A-Z0-9_]*)\s*=/);
      return match?.[1] ? [match[1]] : [];
    });
};

const ensureEnvExampleParity = () => {
  const exampleKeys = parseEnvExampleKeys();
  if (exampleKeys.length === 0) return;

  const declaredKeys = new Set([
    ...Object.keys(serverSchema),
    ...Object.keys(clientSchema),
    ...Object.keys(runtimeEnv),
  ]);

  const missing = exampleKeys.filter((key) => !declaredKeys.has(key));
  if (missing.length > 0) {
    throw new Error(
      `.env.example contains keys without schema definitions in src/env.js: ${missing.join(", ")}`,
    );
  }
};

if (!process.env.SKIP_ENV_VALIDATION) {
  ensureEnvExampleParity();
}

export const env = createEnv({
  server: serverSchema,
  client: clientSchema,
  runtimeEnv,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
