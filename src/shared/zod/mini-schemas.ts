import { clone } from "zod/mini";

import { BuiltVersionCreateSchema } from "~/shared/schemas/built-version";
import { BuiltVersionDefaultSelectionSchema } from "~/shared/schemas/built-version-selection";
import { ReleaseComponentCreateSchema } from "~/shared/schemas/release-component";
import { ReleaseVersionCreateSchema } from "~/shared/schemas/release-version";

export const BuiltVersionCreateSchemaMini = clone(BuiltVersionCreateSchema);
export const BuiltVersionDefaultSelectionInputSchemaMini = clone(
  BuiltVersionDefaultSelectionSchema,
);
export const ReleaseComponentCreateSchemaMini = clone(
  ReleaseComponentCreateSchema,
);
export const ReleaseVersionCreateSchemaMini = clone(ReleaseVersionCreateSchema);
