import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    AUTH_DISCORD_ID: z.string(),
    AUTH_DISCORD_SECRET: z.string(),
    DATABASE_URL: z.string().url(),
    CONTEXT7_API_KEY: z.string(),
    // Jira integration
    JIRA_BASE_URL: z.string().url().optional(),
    JIRA_PROJECT_KEY: z.string().optional(),
    NODE_ENV: z.enum(["development", "test", "production"]),
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: z.string().url().optional(),
    OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: z.string().url().optional(),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
    OTEL_SERVICE_NAME: z.string().optional(),
    OTEL_DEBUG: z.enum(["true", "false"]).optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
    NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: z.string().url().optional(),
    NEXT_PUBLIC_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: z
      .string()
      .url()
      .optional(),
    NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
    NEXT_PUBLIC_OTEL_SERVICE_NAME: z.string().optional(),
    NEXT_PUBLIC_OTEL_DEBUG: z.enum(["true", "false"]).optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_DISCORD_ID: process.env.AUTH_DISCORD_ID,
    AUTH_DISCORD_SECRET: process.env.AUTH_DISCORD_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    CONTEXT7_API_KEY: process.env.CONTEXT7_API_KEY,
    JIRA_BASE_URL: process.env.JIRA_BASE_URL,
    JIRA_PROJECT_KEY: process.env.JIRA_PROJECT_KEY,
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
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
