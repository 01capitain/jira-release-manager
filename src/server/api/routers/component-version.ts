import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { ComponentVersionListByBuiltSchema } from "~/shared/schemas/component-version";
import type { ComponentVersionDto } from "~/shared/types/component-version";
import { ComponentVersionService } from "~/server/services/component-version.service";

export const componentVersionRouter = createTRPCRouter({
  listByBuilt: publicProcedure
    .input(ComponentVersionListByBuiltSchema)
    .query(async ({ ctx, input }): Promise<ComponentVersionDto[]> => {
      const svc = new ComponentVersionService(ctx.db);
      return svc.listByBuilt(input.builtVersionId);
    }),
});
