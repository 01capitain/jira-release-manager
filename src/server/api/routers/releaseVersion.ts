import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { ReleaseVersionService } from "~/server/api/services/releaseVersion";
import { z } from "zod";

const releaseVersionService = new ReleaseVersionService();

export const releaseVersionRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({ name: z.string() }))
    .mutation(({ input }) => {
      return releaseVersionService.create(input);
    }),
  getOne: publicProcedure.input(z.string()).query(({ input }) => {
    return releaseVersionService.getOne(input);
  }),
  getAll: publicProcedure.query(() => {
    return releaseVersionService.getAll();
  }),
  delete: publicProcedure.input(z.string()).mutation(({ input }) => {
    return releaseVersionService.delete(input);
  }),
});
