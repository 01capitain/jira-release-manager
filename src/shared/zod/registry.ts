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
    const internals = (schema as { _zod?: { def?: unknown } })._zod;
    if (internals && "def" in internals) {
      appRegistry.add(schema, meta);
    }
  }
  return schema;
}
