import type { ZodTypeAny } from "zod";
import { clone } from "zod/mini";

import {
  PatchCreateSchema,
  PatchDefaultSelectionInputSchema,
} from "~/shared/schemas/patch";
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

export const PatchCreateSchemaMini: typeof PatchCreateSchema =
  cloneSchema(PatchCreateSchema);
export const PatchDefaultSelectionInputSchemaMini: typeof PatchDefaultSelectionInputSchema =
  cloneSchema(PatchDefaultSelectionInputSchema);
export const ReleaseComponentCreateSchemaMini: typeof ReleaseComponentCreateSchema =
  cloneSchema(ReleaseComponentCreateSchema);
export const ReleaseVersionCreateSchemaMini: typeof ReleaseVersionCreateSchema =
  cloneSchema(ReleaseVersionCreateSchema);
