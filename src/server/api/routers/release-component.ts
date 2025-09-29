import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  requireUserId,
} from "~/server/api/trpc";
import { ReleaseComponentCreateSchema } from "~/shared/schemas/release-component";
import type { ReleaseComponentDto } from "~/shared/types/release-component";
import { ReleaseComponentService } from "~/server/services/release-component.service";
import { ActionHistoryService } from "~/server/services/action-history.service";

export const releaseComponentRouter = createTRPCRouter({
  list: publicProcedure.query(
    async ({ ctx }): Promise<ReleaseComponentDto[]> => {
      const svc = new ReleaseComponentService(ctx.db);
      return svc.list();
    },
  ),

  create: protectedProcedure
    .input(ReleaseComponentCreateSchema)
    .mutation(async ({ ctx, input }): Promise<ReleaseComponentDto> => {
      const svc = new ReleaseComponentService(ctx.db);
      const userId = requireUserId(ctx.session);
      const history = new ActionHistoryService(ctx.db);
      const trimmedName = input.name.trim();
      const action = await history.startAction({
        actionType: "releaseComponent.create",
        message: `Create release component ${trimmedName}`,
        userId,
        sessionToken: ctx.sessionToken ?? null,
        metadata: { color: input.color },
      });
      try {
        const result = await svc.create(userId, input, { logger: action });
        await action.complete("success", {
          message: `Release component ${result.name} created`,
          metadata: { id: result.id },
        });
        return result;
      } catch (err) {
        await action.complete("failed", {
          message: `Failed to create release component ${trimmedName}`,
          metadata: {
            error: err instanceof Error ? err.message : String(err),
          },
        });
        throw err;
      }
    }),
});
