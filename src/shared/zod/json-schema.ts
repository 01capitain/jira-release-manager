import { z } from "zod";

import { appRegistry, type AppSchemaMeta } from "~/shared/zod/registry";

export type ToRestJsonSchemaOptions = AppSchemaMeta & {
  /** When true, the schema metadata is not added to the shared registry. */
  skipRegistry?: boolean;
};

export function toRestJsonSchema<T extends z.ZodTypeAny>(
  schema: T,
  options?: ToRestJsonSchemaOptions,
) {
  const { skipRegistry, ...rawMeta } = options ?? {};
  const meta = Object.fromEntries(
    Object.entries(rawMeta).filter(([, value]) => value !== undefined),
  );
  const hasMeta = Object.keys(meta).length > 0;
  const targetSchema = hasMeta ? schema.meta(meta) : schema;
  if (hasMeta && !skipRegistry) {
    appRegistry.add(targetSchema, meta);
  }
  return z.toJSONSchema(targetSchema, {
    target: "openapi-3.0",
    metadata: appRegistry,
  });
}
