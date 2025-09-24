import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { BuiltVersionCreateSchema } from "~/shared/schemas/built-version";
import { ReleaseVersionService } from "~/server/services/release-version.service";
import { BuiltVersionService } from "~/server/services/built-version.service";
import { BuiltVersionStatusService } from "~/server/services/built-version-status.service";
import { SuccessorBuiltService } from "~/server/services/successor-built.service";
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

  // Determine default selection for deployment based on the most recent active build in the same release
  defaultSelection: publicProcedure
    .input(z.object({ builtVersionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const built = await ctx.db.builtVersion.findUniqueOrThrow({
        where: { id: input.builtVersionId },
        select: { id: true, versionId: true },
      });
      // Find all builds for this release, newest first
      const builds = await ctx.db.builtVersion.findMany({
        where: { versionId: built.versionId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      const buildIds = builds.map((b) => b.id);
      const transitions = await ctx.db.builtVersionTransition.findMany({
        where: { builtVersionId: { in: buildIds } },
        orderBy: { createdAt: "desc" },
        select: { builtVersionId: true, toStatus: true, createdAt: true },
      });
      const latestByBuild = new Map<string, string>();
      for (const t of transitions) {
        if (!latestByBuild.has(t.builtVersionId)) latestByBuild.set(t.builtVersionId, t.toStatus);
      }
      const activeBuiltId = builds.find((b) => latestByBuild.get(b.id) === "active")?.id ?? null;

      if (!activeBuiltId) {
        // No prior active build; default to all components.
        // Note: ReleaseComponents are global (not per Release), so this intentionally
        // does not filter by releaseId.
        const all = await ctx.db.releaseComponent.findMany({ select: { id: true } });
        return { selectedReleaseComponentIds: all.map((c) => c.id) } as const;
      }
      const rows = await ctx.db.componentVersion.findMany({
        where: { builtVersionId: activeBuiltId },
        select: { releaseComponentId: true },
      });
      const selected = Array.from(new Set(rows.map((r) => r.releaseComponentId)));
      return { selectedReleaseComponentIds: selected } as const;
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

  // Apply selection to create the successor built arrangement (no status change)
  createSuccessorBuilt: protectedProcedure
    .input(z.object({
      builtVersionId: z.string().uuid(),
      selectedReleaseComponentIds: z.array(z.string().uuid()).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const svc = new SuccessorBuiltService(ctx.db);
      const statusSvc = new BuiltVersionStatusService(ctx.db);
      try {
        const summary = await svc.createSuccessorBuilt(
          input.builtVersionId,
          input.selectedReleaseComponentIds,
          ctx.session.user.id,
        );
        // Do not change status here; keep build in `in_deployment`.
        const status = await statusSvc.getCurrentStatus(input.builtVersionId);
        const history = await statusSvc.getHistory(input.builtVersionId);
        return { status, history, summary } as const;
      } catch (err: unknown) {
        const e = err as { message?: string; code?: string; details?: unknown };
        const code =
          e?.code === "VALIDATION_ERROR" || e?.code === "INVALID_STATE" || e?.code === "MISSING_SUCCESSOR"
            ? "BAD_REQUEST"
            : "INTERNAL_SERVER_ERROR";
        throw new TRPCError({
          code,
          message: e?.message ?? "Create successor built failed",
          cause: e,
        });
      }
    }),
});
