import type { z } from "zod";
import { BuiltVersionDefaultSelectionSchema } from "~/shared/schemas/built-version-selection";

export type BuiltVersionDefaultSelectionDto = z.infer<
  typeof BuiltVersionDefaultSelectionSchema
>;
