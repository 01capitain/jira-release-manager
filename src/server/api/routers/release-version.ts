import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { ReleaseVersionService } from "~/server/services/release-version.service";
import {
  DEFAULT_RELEASE_VERSION_LIST_INPUT,
  ReleaseVersionListInputSchema,
} from "~/server/api/schemas";

export const releaseVersionRouter = createTRPCRouter({
  list: publicProcedure
    .input(ReleaseVersionListInputSchema)
    .query(async ({ ctx, input }) => {
      const params = input ?? DEFAULT_RELEASE_VERSION_LIST_INPUT;
      const svc = new ReleaseVersionService(ctx.db);
      return svc.list(params);
    }),
});
