import { clone } from "zod/mini";

import { BuiltVersionCreateSchema } from "~/shared/schemas/built-version";
import { BuiltVersionDefaultSelectionInputSchema } from "~/shared/schemas/built-version-selection";
import { ReleaseComponentCreateSchema } from "~/shared/schemas/release-component";
import { ReleaseVersionCreateSchema } from "~/shared/schemas/release-version";

export const BuiltVersionCreateSchemaMini = clone(BuiltVersionCreateSchema);
export const BuiltVersionDefaultSelectionInputSchemaMini = clone(
  BuiltVersionDefaultSelectionInputSchema,
);
export const ReleaseComponentCreateSchemaMini = clone(
  ReleaseComponentCreateSchema,
);
export const ReleaseVersionCreateSchemaMini = clone(ReleaseVersionCreateSchema);
