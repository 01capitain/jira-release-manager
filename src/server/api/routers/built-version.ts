import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { BuiltVersionCreateSchema } from "~/shared/schemas/built-version";
import { ReleaseVersionService } from "~/server/services/release-version.service";
import { BuiltVersionService } from "~/server/services/built-version.service";
import { BuiltVersionStatusService } from "~/server/services/built-version-status.service";
import type { BuiltVersionAction } from "~/shared/types/built-version-status";
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

  // Derive current status and return full history for a Built Version
  getStatus: publicProcedure
    .input(z.object({ builtVersionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const svc = new BuiltVersionStatusService(ctx.db);
      const [status, history] = await Promise.all([
        svc.getCurrentStatus(input.builtVersionId),
        svc.getHistory(input.builtVersionId),
      ]);
      return { status, history } as const;
    }),

  // Perform a transition; only allowed actions from current state succeed
  transition: protectedProcedure
    .input(z.object({
      builtVersionId: z.string().uuid(),
      action: z.enum([
        "startDeployment",
        "cancelDeployment",
        "markActive",
        "revertToDeployment",
        "deprecate",
        "reactivate",
      ]) as unknown as z.ZodType<BuiltVersionAction>,
    }))
    .mutation(async ({ ctx, input }) => {
      const svc = new BuiltVersionStatusService(ctx.db);
      try {
        const res = await svc.transition(
          input.builtVersionId,
          input.action,
          ctx.session.user.id,
        );
        const history = await svc.getHistory(input.builtVersionId);
        return { ...res, history } as const;
import { TRPCError } from "@trpc/server";
      } catch (err: unknown) {
        const e = err as { message?: string; code?: string; details?: unknown };
        const code =
          e?.code === "INVALID_TRANSITION" ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR";
        throw new TRPCError({
          code,
          message: e?.message ?? "Transition failed",
          cause: e,
        });
      }
    }),
});
