import type { ReleaseVersionDto } from "~/shared/types/release-version";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { ReleaseVersionService } from "~/server/services/release-version.service";
import { ReleaseVersionListInputSchema } from "~/server/api/schemas";
import { ReleaseVersionCreateSchema } from "~/shared/schemas/release-version";

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
      return svc.create(ctx.session.user.id, input.name);
    }),
});
