import {
  Prisma,
  type PrismaClient,
  type ReleaseComponent,
  type ReleaseVersion,
  type User,
} from "@prisma/client";
import type { ReleaseComponentCreateInput } from "~/shared/schemas/release-component";
import type { ReleaseComponentDto } from "~/shared/types/release-component";
import {
  mapToReleaseComponentDtos,
  toReleaseComponentDto,
} from "~/server/zod/dto/release-component.dto";
import type { ActionLogger } from "~/server/services/action-history.service";
import { RestError } from "~/server/rest/errors";

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

  async paginate(
    page: number,
    pageSize: number,
    filters?: {
      search?: string | null;
      releaseId?: ReleaseVersion["id"];
    },
  ): Promise<{ total: number; items: ReleaseComponentDto[] }> {
    const where: Prisma.ReleaseComponentWhereInput = {};
    if (filters?.search) {
      where.name = {
        contains: filters.search,
        mode: "insensitive",
      };
    }
    if (filters?.releaseId) {
      where.componentVersions = {
        some: { builtVersion: { versionId: filters.releaseId } },
      };
    }
    const [total, rows] = await Promise.all([
      this.db.releaseComponent.count({ where }),
      this.db.releaseComponent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          color: true,
          namingPattern: true,
          createdAt: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { total, items: mapToReleaseComponentDtos(rows) };
  }

  async getById(
    componentId: ReleaseComponent["id"],
  ): Promise<ReleaseComponentDto> {
    const row = await this.db.releaseComponent.findUnique({
      where: { id: componentId },
      select: {
        id: true,
        name: true,
        color: true,
        namingPattern: true,
        createdAt: true,
      },
    });
    if (!row) {
      throw Object.assign(
        new Error(`Release component ${componentId} not found`),
        {
          code: "NOT_FOUND",
          details: { componentId },
        },
      );
    }
    return toReleaseComponentDto(row);
  }

  async create(
    userId: User["id"],
    input: ReleaseComponentCreateInput,
    options?: { logger?: ActionLogger },
  ): Promise<ReleaseComponentDto> {
    const trimmedName = input.name.trim();
    try {
      const created = await this.db.releaseComponent.create({
        data: {
          name: trimmedName,
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
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new RestError(
          409,
          "CONFLICT",
          `Release component ${trimmedName} already exists`,
          { name: trimmedName },
        );
      }
      throw error;
    }
  }
}
