import { z } from "zod";

import { ReleaseComponentScopes } from "~/shared/types/release-component";

export const AllowedBaseColors = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
] as const;

export const ReleaseComponentScopeSchema = z.enum(ReleaseComponentScopes);

export const ReleaseComponentCreateSchema = z.object({
  name: z.string().trim().min(1, { error: "Please enter a name." }),
  color: z.enum(AllowedBaseColors, {
    error: "Please choose a valid base color.",
  }),
  namingPattern: z
    .string()
    .trim()
    .min(1, { error: "Please enter a naming pattern." })
    .refine(
      (p) => {
        // Only allow known tokens: {release_version}, {patch}, {increment}
        const tokenRegex = /\{[^}]+\}/g;
        const tokens = p.match(tokenRegex) ?? [];
        return tokens.every((t) =>
          ["{release_version}", "{patch}", "{increment}"].includes(t),
        );
      },
      {
        error:
          "Pattern may only contain {release_version}, {patch}, {increment} tokens.",
      },
    ),
  releaseScope: ReleaseComponentScopeSchema,
});

export type ReleaseComponentCreateInput = z.infer<
  typeof ReleaseComponentCreateSchema
>;
