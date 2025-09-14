import { z } from "zod";
import type { ReleaseVersionDto } from "~/shared/types/release-version";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { ReleaseVersionService } from "~/server/services/release-version.service";
import { ReleaseVersionCreateSchema } from "~/shared/schemas/release-version";

export const releaseVersionRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z
        .object({
          page: z.number().int().min(1).optional(),
          pageSize: z.number().int().min(1).max(100).optional(),
        })
        .optional(),
    )
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
