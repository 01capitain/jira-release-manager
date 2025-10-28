import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { ComponentVersionListByBuiltSchema } from "~/server/api/schemas";
import { ComponentVersionService } from "~/server/services/component-version.service";

export const componentVersionRouter = createTRPCRouter({
  listByBuilt: publicProcedure
    .input(ComponentVersionListByBuiltSchema)
    .query(async ({ ctx, input }) => {
      const svc = new ComponentVersionService(ctx.db);
      return svc.listByBuilt(input.builtVersionId);
    }),
});
