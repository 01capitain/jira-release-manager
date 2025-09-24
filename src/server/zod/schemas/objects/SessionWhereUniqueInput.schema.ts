import { z } from "zod";
import type { Prisma } from "@prisma/client";

const makeSchema = () =>
  z
    .object({
      id: z.string().optional(),
      sessionToken: z.string().optional(),
    })
    .strict()
    .superRefine((obj, ctx) => {
      const top = obj as Record<string, unknown>;
      const presentTop = (k: string) => top[k] != null;
      const singles: string[] = ["id", "sessionToken"] as string[];
      const groups: string[][] = [] as string[][];

      const anySingle =
        Array.isArray(singles) && singles.length > 0
          ? singles.some(presentTop)
          : false;

      let anyComposite = false;
      if (Array.isArray(groups) && groups.length > 0) {
        // Iterate over nested composite selectors (e.g., { composite_key_name: { a: ..., b: ... } })
        for (const [propKey, composite] of Object.entries(
          obj as Record<string, unknown>,
        )) {
          if (!composite || typeof composite !== "object") continue;
          for (const g of groups) {
            if (!Array.isArray(g) || g.length === 0) continue;
            const presentInComposite = (k: string) =>
              (composite as Record<string, unknown>)[k] != null;
            const provided = (g).filter(presentInComposite).length;
            if (provided > 0 && provided < g.length) {
              for (const f of g) {
                if (!presentInComposite(f)) {
                  ctx.addIssue({
                    code: "custom",
                    message: "All fields of composite unique must be provided",
                    path: [propKey, f],
                  });
                }
              }
            }
            if (provided === g.length && g.length > 0) {
              anyComposite = true;
            }
          }
        }
      }

      if (!anySingle && !anyComposite) {
        ctx.addIssue({
          code: "custom",
          message: "Provide at least one unique selector",
        });
      }
    });
export const SessionWhereUniqueInputObjectSchema: z.ZodType<Prisma.SessionWhereUniqueInput> =
  makeSchema() as unknown as z.ZodType<Prisma.SessionWhereUniqueInput>;
export const SessionWhereUniqueInputObjectZodSchema = makeSchema();
 
