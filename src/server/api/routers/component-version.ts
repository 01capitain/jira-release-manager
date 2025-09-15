import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import type { ComponentVersionDto } from "~/shared/types/component-version";
import { mapToComponentVersionDtos } from "~/server/zod/dto/component-version.dto";

export const componentVersionRouter = createTRPCRouter({
  listByBuilt: publicProcedure
    .input(z.object({ builtVersionId: z.string().uuid() }))
    .query(async ({ ctx, input }): Promise<ComponentVersionDto[]> => {
      const rows = await ctx.db.componentVersion.findMany({
        where: { builtVersionId: input.builtVersionId },
        orderBy: [{ releaseComponentId: "asc" }, { increment: "asc" }],
        select: {
          id: true,
          releaseComponentId: true,
          builtVersionId: true,
          name: true,
          increment: true,
          createdAt: true,
        },
      });
      return mapToComponentVersionDtos(rows);
    }),
});
