import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  requireUserId,
} from "~/server/api/trpc";
import {
  BuiltVersionCreateSchema,
  BuiltVersionDefaultSelectionInputSchema,
  BuiltVersionListByReleaseSchema,
} from "~/shared/schemas/built-version";
import { ReleaseVersionService } from "~/server/services/release-version.service";
import { BuiltVersionService } from "~/server/services/built-version.service";
import {
  BuiltVersionCreateSuccessorInputSchema,
  BuiltVersionStatusInputSchema,
  BuiltVersionTransitionInputSchema,
} from "~/server/api/schemas";
import { BuiltVersionStatusService } from "~/server/services/built-version-status.service";
import { SuccessorBuiltService } from "~/server/services/successor-built.service";
import type { ReleaseVersionWithBuildsDto } from "~/shared/types/release-version-with-builds";
import type { BuiltVersionDto } from "~/shared/types/built-version";
import type { BuiltVersionDefaultSelectionDto } from "~/shared/types/built-version-selection";

export const builtVersionRouter = createTRPCRouter({
  listByRelease: publicProcedure
    .input(BuiltVersionListByReleaseSchema)
    .query(async ({ ctx, input }): Promise<BuiltVersionDto[]> => {
      const svc = new BuiltVersionService(ctx.db);
      return svc.listByRelease(input.versionId);
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
      const userId = requireUserId(ctx.session);
      return svc.create(userId, input.versionId, input.name);
    }),

  // Determine default selection for deployment based on the most recent active build in the same release
  defaultSelection: publicProcedure
    .input(BuiltVersionDefaultSelectionInputSchema)
    .query(async ({ ctx, input }): Promise<BuiltVersionDefaultSelectionDto> => {
      const svc = new BuiltVersionService(ctx.db);
      return svc.getDefaultSelection(input.builtVersionId);
    }),

  // Derive current status and return full history for a Built Version
  getStatus: publicProcedure
    .input(BuiltVersionStatusInputSchema)
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
    .input(BuiltVersionTransitionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const svc = new BuiltVersionStatusService(ctx.db);
      try {
        const res = await svc.transition(
          input.builtVersionId,
          input.action,
          requireUserId(ctx.session),
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
    .input(BuiltVersionCreateSuccessorInputSchema)
    .mutation(async ({ ctx, input }) => {
      const svc = new SuccessorBuiltService(ctx.db);
      const statusSvc = new BuiltVersionStatusService(ctx.db);
      try {
        const summary = await svc.createSuccessorBuilt(
          input.builtVersionId,
          input.selectedReleaseComponentIds,
          requireUserId(ctx.session),
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
