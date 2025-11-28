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

type ReleaseComponentScopeDb = "global" | "version_bound";

type ReleaseComponentRow = {
  id: string;
  name: string;
  color: string;
  namingPattern: string;
  releaseScope: ReleaseComponentScopeDb;
  createdAt: Date;
};

const releaseComponentSelect = {
  id: true,
  name: true,
  color: true,
  namingPattern: true,
  releaseScope: true,
  createdAt: true,
} as const;

export class ReleaseComponentService {
  constructor(private readonly db: PrismaClient) {}

  async list(): Promise<ReleaseComponentDto[]> {
    const delegate = this.db.releaseComponent as unknown as {
      findMany(args?: unknown): Promise<ReleaseComponentRow[]>;
    };
    const rows = await delegate.findMany({
      orderBy: { createdAt: "desc" },
      select: releaseComponentSelect,
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
        some: { patch: { versionId: filters.releaseId } },
      };
    }
    const delegate = this.db.releaseComponent as unknown as {
      findMany(args?: unknown): Promise<ReleaseComponentRow[]>;
    };
    const [total, rows] = await Promise.all([
      this.db.releaseComponent.count({ where }),
      delegate.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: releaseComponentSelect,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      total,
      items: mapToReleaseComponentDtos(rows),
    };
  }

  async getById(
    componentId: ReleaseComponent["id"],
  ): Promise<ReleaseComponentDto> {
    const delegate = this.db.releaseComponent as unknown as {
      findUnique(args: unknown): Promise<ReleaseComponentRow | null>;
    };
    const row = await delegate.findUnique({
      where: { id: componentId },
      select: releaseComponentSelect,
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
      const scopeKey = input.releaseScope;
      if (scopeKey !== "global" && scopeKey !== "version-bound") {
        throw new RestError(400, "VALIDATION_ERROR", "Invalid release scope", {
          releaseScope: input.releaseScope,
        });
      }
      const prismaScope: ReleaseComponentScopeDb =
        scopeKey === "global" ? "global" : "version_bound";
      const delegate = this.db.releaseComponent as unknown as {
        create(args: unknown): Promise<ReleaseComponentRow>;
      };
      const created = await delegate.create({
        data: {
          name: trimmedName,
          color: input.color,
          namingPattern: input.namingPattern.trim(),
          releaseScope: prismaScope,
          createdBy: { connect: { id: userId } },
        },
        select: releaseComponentSelect,
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
