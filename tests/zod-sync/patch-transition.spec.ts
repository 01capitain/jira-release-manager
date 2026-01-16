import { describe, it, expect } from "@jest/globals";
import type { z } from "zod";

import { type PatchTransitionActionContextSchema } from "~/server/zod/dto/patch-transition-preflight.dto";
import type { PatchTransitionActionContext } from "~/shared/types/patch-transition";

type Assert<T extends true> = T;
type Extends<A, B> = [A] extends [B] ? true : false;

type SchemaContext = z.infer<typeof PatchTransitionActionContextSchema>;

const assertTrue = <T extends true>(): Assert<T> => true as Assert<T>;

assertTrue<Extends<SchemaContext, PatchTransitionActionContext>>();
assertTrue<Extends<PatchTransitionActionContext, SchemaContext>>();

describe("PatchTransitionActionContext schema alignment", () => {
  it("ensures the Zod schema matches the shared type contract", () => {
    expect(true).toBe(true);
  });
});
