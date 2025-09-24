import { z } from "zod";
import { ReleaseVersionSelectObjectSchema } from "./ReleaseVersionSelect.schema";
import { ReleaseVersionIncludeObjectSchema } from "./ReleaseVersionInclude.schema";

const makeSchema = () =>
  z
    .object({
      select: z.lazy(() => ReleaseVersionSelectObjectSchema).optional(),
      include: z.lazy(() => ReleaseVersionIncludeObjectSchema).optional(),
    })
    .strict();
export const ReleaseVersionArgsObjectSchema = makeSchema();
export const ReleaseVersionArgsObjectZodSchema = makeSchema();
