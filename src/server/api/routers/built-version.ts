import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";
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
} from "~/server/api/schemas";
import { BuiltVersionStatusService } from "~/server/services/built-version-status.service";
import { SuccessorBuiltService } from "~/server/services/successor-built.service";
import type { ReleaseVersionWithBuildsDto } from "~/shared/types/release-version-with-builds";
import type { BuiltVersionDto } from "~/shared/types/built-version";
import type { BuiltVersionDefaultSelectionDto } from "~/shared/types/built-version-selection";
import { ActionHistoryService } from "~/server/services/action-history.service";
import type { BuiltVersionAction } from "~/shared/types/built-version-status";

type TransitionContext = {
  db: PrismaClient;
  session: { user?: { id?: string | null } } | null;
  sessionToken?: string | null;
};

const executeTransition = async (
  ctx: TransitionContext,
  builtVersionId: string,
  action: BuiltVersionAction,
) => {
  const svc = new BuiltVersionStatusService(ctx.db);
  const historySvc = new ActionHistoryService(ctx.db);
  const userId = requireUserId(ctx.session);
  const actionLog = await historySvc.startAction({
    actionType: `builtVersion.transition.${action}`,
    message: `Transition built version ${builtVersionId} via ${action}`,
    userId,
    sessionToken: ctx.sessionToken ?? null,
  });
  try {
    const res = await svc.transition(builtVersionId, action, userId, {
      logger: actionLog,
    });
    const history = await svc.getHistory(builtVersionId);
    await actionLog.complete("success", {
      message: `Built version ${builtVersionId} now ${res.status}`,
      metadata: {
        builtVersionId,
        action,
      },
    });
    return { ...res, history } as const;
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string; details?: unknown };
    const code =
      e?.code === "INVALID_TRANSITION"
        ? "BAD_REQUEST"
        : "INTERNAL_SERVER_ERROR";
    await actionLog.complete("failed", {
      message: `Failed to transition built version ${builtVersionId}`,
      metadata: {
        action,
        error: e?.message ?? String(err),
        details: e?.details ?? null,
      },
    });
    throw new TRPCError({
      code,
      message: e?.message ?? "Transition failed",
      cause: e,
    });
  }
};

export const builtVersionRouter = createTRPCRouter({
  listByRelease: publicProcedure
    .input(BuiltVersionListByReleaseSchema)
    .query(
      async ({
        ctx,
        input,
      }: {
        ctx: TransitionContext;
        input: { versionId: string };
      }): Promise<BuiltVersionDto[]> => {
        const svc = new BuiltVersionService(ctx.db);
        return svc.listByRelease(input.versionId);
      },
    ),

  listReleasesWithBuilds: publicProcedure.query(
    async ({
      ctx,
    }: {
      ctx: TransitionContext;
    }): Promise<ReleaseVersionWithBuildsDto[]> => {
      const svc = new ReleaseVersionService(ctx.db);
      return svc.listWithBuilds();
    },
  ),

  create: protectedProcedure
    .input(BuiltVersionCreateSchema)
    .mutation(
      async ({
        ctx,
        input,
      }: {
        ctx: TransitionContext;
        input: { versionId: string; name: string };
      }): Promise<BuiltVersionDto> => {
        const svc = new BuiltVersionService(ctx.db);
        const userId = requireUserId(ctx.session);
        const history = new ActionHistoryService(ctx.db);
        const trimmed = input.name.trim();
        const action = await history.startAction({
          actionType: "builtVersion.create",
          message: `Create built version ${trimmed}`,
          userId,
          sessionToken: ctx.sessionToken ?? null,
          metadata: { versionId: input.versionId },
        });
        try {
          const result = await svc.create(userId, input.versionId, trimmed, {
            logger: action,
          });
          await action.complete("success", {
            message: `Built version ${result.name} created`,
            metadata: { id: result.id, versionId: result.versionId },
          });
          return result;
        } catch (err) {
          await action.complete("failed", {
            message: `Failed to create built version ${trimmed}`,
            metadata: {
              error: err instanceof Error ? err.message : String(err),
              versionId: input.versionId,
            },
          });
          throw err;
        }
      },
    ),

  // Determine default selection for deployment based on the most recent active build in the same release
  defaultSelection: publicProcedure
    .input(BuiltVersionDefaultSelectionInputSchema)
    .query(
      async ({
        ctx,
        input,
      }: {
        ctx: TransitionContext;
        input: { builtVersionId: string };
      }): Promise<BuiltVersionDefaultSelectionDto> => {
        const svc = new BuiltVersionService(ctx.db);
        return svc.getDefaultSelection(input.builtVersionId);
      },
    ),

  // Derive current status and return full history for a Built Version
  getStatus: publicProcedure
    .input(BuiltVersionStatusInputSchema)
    .query(
      async ({
        ctx,
        input,
      }: {
        ctx: TransitionContext;
        input: { builtVersionId: string };
      }) => {
        const svc = new BuiltVersionStatusService(ctx.db);
        const [status, history] = await Promise.all([
          svc.getCurrentStatus(input.builtVersionId),
          svc.getHistory(input.builtVersionId),
        ]);
        return { status, history } as const;
      },
    ),

  startDeployment: protectedProcedure
    .input(BuiltVersionStatusInputSchema)
    .mutation(
      async ({
        ctx,
        input,
      }: {
        ctx: TransitionContext;
        input: { builtVersionId: string };
      }) => executeTransition(ctx, input.builtVersionId, "startDeployment"),
    ),

  cancelDeployment: protectedProcedure
    .input(BuiltVersionStatusInputSchema)
    .mutation(
      async ({
        ctx,
        input,
      }: {
        ctx: TransitionContext;
        input: { builtVersionId: string };
      }) => executeTransition(ctx, input.builtVersionId, "cancelDeployment"),
    ),

  markActive: protectedProcedure
    .input(BuiltVersionStatusInputSchema)
    .mutation(
      async ({
        ctx,
        input,
      }: {
        ctx: TransitionContext;
        input: { builtVersionId: string };
      }) => executeTransition(ctx, input.builtVersionId, "markActive"),
    ),

  revertToDeployment: protectedProcedure
    .input(BuiltVersionStatusInputSchema)
    .mutation(
      async ({
        ctx,
        input,
      }: {
        ctx: TransitionContext;
        input: { builtVersionId: string };
      }) => executeTransition(ctx, input.builtVersionId, "revertToDeployment"),
    ),

  deprecate: protectedProcedure
    .input(BuiltVersionStatusInputSchema)
    .mutation(
      async ({
        ctx,
        input,
      }: {
        ctx: TransitionContext;
        input: { builtVersionId: string };
      }) => executeTransition(ctx, input.builtVersionId, "deprecate"),
    ),

  reactivate: protectedProcedure
    .input(BuiltVersionStatusInputSchema)
    .mutation(
      async ({
        ctx,
        input,
      }: {
        ctx: TransitionContext;
        input: { builtVersionId: string };
      }) => executeTransition(ctx, input.builtVersionId, "reactivate"),
    ),

  // Apply selection to create the successor built arrangement (no status change)
  createSuccessorBuilt: protectedProcedure
    .input(BuiltVersionCreateSuccessorInputSchema)
    .mutation(
      async ({
        ctx,
        input,
      }: {
        ctx: TransitionContext;
        input: {
          builtVersionId: string;
          selectedReleaseComponentIds: string[];
        };
      }) => {
        const svc = new SuccessorBuiltService(ctx.db);
        const statusSvc = new BuiltVersionStatusService(ctx.db);
        const historySvc = new ActionHistoryService(ctx.db);
        const userId = requireUserId(ctx.session);
        const actionLog = await historySvc.startAction({
          actionType: "builtVersion.successor.apply",
          message: `Arrange successor components for ${input.builtVersionId}`,
          userId,
          sessionToken: ctx.sessionToken ?? null,
          metadata: {
            selectionCount: input.selectedReleaseComponentIds.length,
          },
        });
        try {
          const summary = await svc.createSuccessorBuilt(
            input.builtVersionId,
            input.selectedReleaseComponentIds,
            userId,
            { logger: actionLog },
          );
          // Do not change status here; keep build in `in_deployment`.
          const status = await statusSvc.getCurrentStatus(input.builtVersionId);
          const history = await statusSvc.getHistory(input.builtVersionId);
          await actionLog.complete("success", {
            message: `Successor prepared for ${input.builtVersionId}`,
            metadata: summary,
          });
          return { status, history, summary } as const;
        } catch (err: unknown) {
          const e = err as {
            message?: string;
            code?: string;
            details?: unknown;
          };
          const code =
            e?.code === "VALIDATION_ERROR" ||
            e?.code === "INVALID_STATE" ||
            e?.code === "MISSING_SUCCESSOR"
              ? "BAD_REQUEST"
              : "INTERNAL_SERVER_ERROR";
          await actionLog.complete("failed", {
            message: `Failed to arrange successor for ${input.builtVersionId}`,
            metadata: {
              error: e?.message ?? String(err),
              code: e?.code ?? code,
            },
          });
          throw new TRPCError({
            code,
            message: e?.message ?? "Create successor built failed",
            cause: e,
          });
        }
      },
    ),
});
