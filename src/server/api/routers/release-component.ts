import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { ReleaseComponentCreateSchema } from "~/shared/schemas/release-component";
import type { ReleaseComponentDto } from "~/shared/types/release-component";
import { ReleaseComponentService } from "~/server/services/release-component.service";

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
      return svc.create(ctx.session.user.id, input);
    }),
});
