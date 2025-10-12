import { z } from "zod";

export type AppSchemaMeta = {
  id?: string;
  title?: string;
  description?: string;
  examples?: unknown[];
};

export const appRegistry = z.registry<AppSchemaMeta>();

export function registerSchema<T extends z.ZodTypeAny>(
  schema: T,
  meta: AppSchemaMeta,
  options?: { skipRegistry?: boolean },
): T {
  if (!options?.skipRegistry) {
    appRegistry.add(schema, meta);
  }
  return schema;
}
