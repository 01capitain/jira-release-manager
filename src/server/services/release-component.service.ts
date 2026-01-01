import {
  Prisma,
  type PrismaClient,
  type ReleaseComponent,
  type ReleaseVersion,
  type User,
} from "@prisma/client";
import type { ReleaseComponentCreateInput } from "~/shared/schemas/release-component";
import type { ActionLogger } from "~/server/services/action-history.service";
import { RestError } from "~/server/rest/errors";

type ReleaseComponentScopeDb = "global" | "version_bound";

const releaseComponentSelect = {
  id: true,
  name: true,
  color: true,
  namingPattern: true,
  releaseScope: true,
  createdAt: true,
} as const satisfies Prisma.ReleaseComponentSelect;

export type ReleaseComponentRow = Prisma.ReleaseComponentGetPayload<{
  select: typeof releaseComponentSelect;
}>;

export class ReleaseComponentService {
  constructor(private readonly db: PrismaClient) {}

  async list(): Promise<ReleaseComponentRow[]> {
    const rows = await this.db.releaseComponent.findMany({
      orderBy: { createdAt: "desc" },
      select: releaseComponentSelect,
    });
    return rows;
  }

  async paginate(
    page: number,
    pageSize: number,
    filters?: {
      search?: string | null;
      releaseId?: ReleaseVersion["id"];
    },
  ): Promise<{ total: number; items: ReleaseComponentRow[] }> {
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
    const [total, rows] = await Promise.all([
      this.db.releaseComponent.count({ where }),
      this.db.releaseComponent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: releaseComponentSelect,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { total, items: rows };
  }

  async getById(
    componentId: ReleaseComponent["id"],
  ): Promise<ReleaseComponentRow> {
    const row = await this.db.releaseComponent.findUnique({
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
    return row;
  }

  async create(
    userId: User["id"],
    input: ReleaseComponentCreateInput,
    options?: { logger?: ActionLogger },
  ): Promise<ReleaseComponentRow> {
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
      const created = await this.db.releaseComponent.create({
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
      return created;
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
