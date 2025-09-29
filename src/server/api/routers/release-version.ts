import type { ReleaseVersionDto } from "~/shared/types/release-version";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  requireUserId,
} from "~/server/api/trpc";
import { ReleaseVersionService } from "~/server/services/release-version.service";
import { ReleaseVersionListInputSchema } from "~/server/api/schemas";
import { ReleaseVersionCreateSchema } from "~/shared/schemas/release-version";
import { ActionHistoryService } from "~/server/services/action-history.service";

export const releaseVersionRouter = createTRPCRouter({
  list: publicProcedure
    .input(ReleaseVersionListInputSchema)
    .query(
      async ({
        ctx,
        input,
      }): Promise<{ total: number; items: ReleaseVersionDto[] }> => {
        const page = input?.page ?? 1;
        const pageSize = input?.pageSize ?? 9;
        const svc = new ReleaseVersionService(ctx.db);
        return svc.list(page, pageSize);
      },
    ),

  create: protectedProcedure
    .input(ReleaseVersionCreateSchema)
    .mutation(async ({ ctx, input }): Promise<ReleaseVersionDto> => {
      const svc = new ReleaseVersionService(ctx.db);
      const userId = requireUserId(ctx.session);
      const history = new ActionHistoryService(ctx.db);
      const trimmed = input.name.trim();
      const action = await history.startAction({
        actionType: "releaseVersion.create",
        message: `Create release ${trimmed}`,
        userId,
        sessionToken: ctx.sessionToken ?? null,
      });
      try {
        const result = await svc.create(userId, trimmed, { logger: action });
        await action.complete("success", {
          message: `Release ${result.name} created`,
          metadata: { id: result.id },
        });
        return result;
      } catch (err) {
        await action.complete("failed", {
          message: `Failed to create release ${trimmed}`,
          metadata: {
            error: err instanceof Error ? err.message : String(err),
          },
        });
        throw err;
      }
    }),
});
