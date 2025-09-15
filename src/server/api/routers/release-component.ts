import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { ReleaseComponentCreateSchema } from "~/shared/schemas/release-component";
import type { ReleaseComponentDto } from "~/shared/types/release-component";
import {
  mapToReleaseComponentDtos,
  toReleaseComponentDto,
} from "~/server/zod/dto/release-component.dto";

export const releaseComponentRouter = createTRPCRouter({
  list: publicProcedure.query(
    async ({ ctx }): Promise<ReleaseComponentDto[]> => {
      const rows = await ctx.db.releaseComponent.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          color: true,
          namingPattern: true,
          createdAt: true,
        },
      });
      return mapToReleaseComponentDtos(rows);
    },
  ),

  create: protectedProcedure
    .input(ReleaseComponentCreateSchema)
    .mutation(async ({ ctx, input }): Promise<ReleaseComponentDto> => {
      const created = await ctx.db.releaseComponent.create({
        data: {
          name: input.name.trim(),
          color: input.color,
          namingPattern: input.namingPattern.trim(),
          createdBy: { connect: { id: ctx.session.user.id } },
        },
        select: {
          id: true,
          name: true,
          color: true,
          namingPattern: true,
          createdAt: true,
        },
      });
      return toReleaseComponentDto(created);
    }),
});
