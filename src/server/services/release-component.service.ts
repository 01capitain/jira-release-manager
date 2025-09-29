import type { PrismaClient, User } from "@prisma/client";
import type { ReleaseComponentCreateInput } from "~/shared/schemas/release-component";
import type { ReleaseComponentDto } from "~/shared/types/release-component";
import {
  mapToReleaseComponentDtos,
  toReleaseComponentDto,
} from "~/server/zod/dto/release-component.dto";
import type { ActionLogger } from "~/server/services/action-history.service";

export class ReleaseComponentService {
  constructor(private readonly db: PrismaClient) {}

  async list(): Promise<ReleaseComponentDto[]> {
    const rows = await this.db.releaseComponent.findMany({
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
  }

  async create(
    userId: User["id"],
    input: ReleaseComponentCreateInput,
    options?: { logger?: ActionLogger },
  ): Promise<ReleaseComponentDto> {
    const created = await this.db.releaseComponent.create({
      data: {
        name: input.name.trim(),
        color: input.color,
        namingPattern: input.namingPattern.trim(),
        createdBy: { connect: { id: userId } },
      },
      select: {
        id: true,
        name: true,
        color: true,
        namingPattern: true,
        createdAt: true,
      },
    });
    await options?.logger?.subaction({
      subactionType: "releaseComponent.persist",
      message: `Component ${created.name} stored`,
      metadata: { id: created.id, color: created.color },
    });
    return toReleaseComponentDto(created);
  }
}
