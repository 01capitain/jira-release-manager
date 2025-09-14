import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { BuiltVersionCreateSchema } from "~/shared/schemas/built-version";
import { ReleaseVersionService } from "~/server/services/release-version.service";
import { BuiltVersionService } from "~/server/services/built-version.service";
import type { ReleaseVersionWithBuildsDto } from "~/shared/types/release-version-with-builds";
import type { BuiltVersionDto } from "~/shared/types/built-version";

export const builtVersionRouter = createTRPCRouter({
  listByRelease: publicProcedure
    .input(z.object({ versionId: z.string().uuid() }))
    .query(async ({ ctx, input }): Promise<BuiltVersionDto[]> => {
      const rows = await ctx.db.builtVersion.findMany({
        where: { versionId: input.versionId },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, versionId: true, createdAt: true },
      });
      // Lazy import to avoid circulars; direct zod schema mapping is done in service elsewhere
      const { mapToBuiltVersionDtos } = await import(
        "~/server/zod/dto/built-version.dto"
      );
      return mapToBuiltVersionDtos(rows);
    }),

  listReleasesWithBuilds: publicProcedure.query(
    async ({ ctx }): Promise<ReleaseVersionWithBuildsDto[]> => {
      const svc = new ReleaseVersionService(ctx.db);
      return svc.listWithBuilds();
    },
  ),

  create: protectedProcedure
    .input(BuiltVersionCreateSchema)
    .mutation(async ({ ctx, input }): Promise<BuiltVersionDto> => {
      const svc = new BuiltVersionService(ctx.db);
      return svc.create(ctx.session.user.id, input.versionId, input.name);
    }),
});

