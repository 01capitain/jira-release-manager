import {
  createTRPCRouter,
  protectedProcedure,
  requireUserId,
} from "~/server/api/trpc";
import { ActionHistoryService } from "~/server/services/action-history.service";
import { ActionHistoryListInputSchema } from "~/server/api/schemas";

export const actionHistoryRouter = createTRPCRouter({
  current: protectedProcedure
    .input(ActionHistoryListInputSchema)
    .query(async ({ ctx, input }) => {
      const svc = new ActionHistoryService(ctx.db);
      const limit = input?.limit ?? 50;
      const sessionToken = ctx.sessionToken ?? null;
      const userId = requireUserId(ctx.session);
      return svc.listBySession(sessionToken, userId, limit);
    }),
});
