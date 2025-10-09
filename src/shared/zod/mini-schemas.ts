import type { ZodTypeAny } from "zod";
import { clone } from "zod/mini";

import { BuiltVersionCreateSchema } from "~/shared/schemas/built-version";
import { BuiltVersionDefaultSelectionInputSchema } from "~/shared/schemas/built-version-selection";
import { ReleaseComponentCreateSchema } from "~/shared/schemas/release-component";
import { ReleaseVersionCreateSchema } from "~/shared/schemas/release-version";

const isZodType = (value: unknown): value is ZodTypeAny => {
  if (!value || typeof value !== "object") return false;
  return typeof (value as { parse?: unknown }).parse === "function";
};

const cloneSchema = <T extends ZodTypeAny>(schema: T): T => {
  const cloned: unknown = clone(schema);
  if (!isZodType(cloned)) {
    throw new Error("Failed to clone schema");
  }
  return cloned as T;
};

/* eslint-disable @typescript-eslint/no-unsafe-assignment --
   zod's clone helper preserves schema typing but its type definition includes internal `any`
   generics, which trips the lint rule. We ensure the clone result is still a Zod schema via
   `isZodType` before exposing it. */
export const BuiltVersionCreateSchemaMini: typeof BuiltVersionCreateSchema =
  cloneSchema(BuiltVersionCreateSchema);
export const BuiltVersionDefaultSelectionInputSchemaMini: typeof BuiltVersionDefaultSelectionInputSchema =
  cloneSchema(BuiltVersionDefaultSelectionInputSchema);
export const ReleaseComponentCreateSchemaMini: typeof ReleaseComponentCreateSchema =
  cloneSchema(ReleaseComponentCreateSchema);
export const ReleaseVersionCreateSchemaMini: typeof ReleaseVersionCreateSchema =
  cloneSchema(ReleaseVersionCreateSchema);
/* eslint-enable @typescript-eslint/no-unsafe-assignment */
