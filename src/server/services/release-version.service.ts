import type {
  Prisma,
  PrismaClient,
  ReleaseVersion,
  User,
} from "@prisma/client";
import { RestError } from "~/server/rest/errors";
import type {
  ActionLogger,
  SubactionInput,
} from "~/server/services/action-history.service";
import { mapToBuiltVersionDtos } from "~/server/zod/dto/built-version.dto";
import {
  mapToReleaseVersionDtos,
  toReleaseVersionDto,
} from "~/server/zod/dto/release-version.dto";
import type { ReleaseVersionDto } from "~/shared/types/release-version";
import type { ReleaseVersionWithBuildsDto } from "~/shared/types/release-version-with-builds";
import type {
  NormalizedPaginatedRequest,
  PaginatedResponse,
} from "~/shared/types/pagination";
import { buildPaginatedResponse } from "~/server/rest/pagination";

export class ReleaseVersionService {
  constructor(private readonly db: PrismaClient) {}

  async list(
    params: NormalizedPaginatedRequest<"createdAt" | "name">,
  ): Promise<PaginatedResponse<ReleaseVersionDto>> {
    const { page, pageSize, sortBy } = params;
    const isDescending = sortBy.startsWith("-");
    const sortField = (isDescending ? sortBy.slice(1) : sortBy) as
      | "createdAt"
      | "name";
    const orderDirection = (isDescending ? "desc" : "asc") as Prisma.SortOrder;
    const orderBy: Prisma.ReleaseVersionOrderByWithRelationInput = {
      [sortField]: orderDirection,
    };
    const [total, rows] = await Promise.all([
      this.db.releaseVersion.count(),
      this.db.releaseVersion.findMany({
        orderBy,
        select: { id: true, name: true, createdAt: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return buildPaginatedResponse(
      mapToReleaseVersionDtos(rows),
      page,
      pageSize,
      total,
    );
  }

  async create(
    userId: User["id"],
    name: string,
    options?: { logger?: ActionLogger },
  ): Promise<ReleaseVersionDto> {
    const auditTrail: SubactionInput[] = [];
    const release = await this.db.$transaction(async (tx) => {
      // Create the release version first
      const release = await tx.releaseVersion.create({
        data: {
          name: name.trim(),
          createdBy: { connect: { id: userId } },
          // start lastUsedIncrement at -1; we'll set to 0 after creating initial built
        },
        // Select only fields needed for DTO to avoid strict schema issues
        select: { id: true, name: true, createdAt: true },
      });
      auditTrail.push({
        subactionType: "releaseVersion.persist",
        message: `Release ${release.name} stored`,
        metadata: { id: release.id },
      });

      // Auto-create initial built version with increment 0
      const builtIncrement = 0;
      const builtName = `${release.name}.${builtIncrement}`;
      const built = await tx.builtVersion.create({
        data: {
          name: builtName,
          version: { connect: { id: release.id } },
          createdBy: { connect: { id: userId } },
          tokenValues: {
            release_version: release.name,
            increment: builtIncrement,
          } as Prisma.InputJsonValue,
        },
        select: { id: true, name: true },
      });
      auditTrail.push({
        subactionType: "builtVersion.autoCreate",
        message: `Initial built ${built.name} created`,
        metadata: { id: built.id, releaseId: release.id },
      });

      // Update release's lastUsedIncrement to 0
      await tx.releaseVersion.update({
        where: { id: release.id },
        data: { lastUsedIncrement: builtIncrement },
      });

      // Create initial component versions for this built
      const components = await tx.releaseComponent.findMany({
        select: { id: true, namingPattern: true },
      });
      if (components.length > 0) {
        const { validatePattern, expandPattern } = await import(
          "~/server/services/component-version-naming.service"
        );
        for (const comp of components) {
          if (!comp.namingPattern?.trim()) continue;
          const { valid } = validatePattern(comp.namingPattern);
          if (!valid) continue;
          const componentIncrement = 0;
          const computedName = expandPattern(comp.namingPattern, {
            releaseVersion: release.name,
            builtVersion: built.name,
            nextIncrement: componentIncrement,
          });
          await tx.componentVersion.create({
            data: {
              name: computedName,
              increment: componentIncrement,
              releaseComponent: { connect: { id: comp.id } },
              builtVersion: { connect: { id: built.id } },
              tokenValues: {
                release_version: release.name,
                built_version: built.name,
                increment: componentIncrement,
              } as Prisma.InputJsonValue,
            },
          });
          auditTrail.push({
            subactionType: "componentVersion.seed",
            message: `Seeded component for built ${built.name}`,
            metadata: {
              releaseComponentId: comp.id,
              builtVersionId: built.id,
            },
          });
        }
      }

      return release;
    });
    if (options?.logger) {
      for (const entry of auditTrail) {
        await options.logger.subaction(entry);
      }
    }
    return toReleaseVersionDto(release);
  }

  async listWithBuilds(): Promise<ReleaseVersionWithBuildsDto[]> {
    const rows = await this.db.releaseVersion.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        builtVersions: {
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, versionId: true, createdAt: true },
        },
      },
    });
    return rows.map((r) => ({
      ...toReleaseVersionDto({
        id: r.id,
        name: r.name,
        createdAt: r.createdAt,
      }),
      builtVersions: mapToBuiltVersionDtos(r.builtVersions),
    }));
  }

  async getById(
    releaseId: ReleaseVersion["id"],
  ): Promise<ReleaseVersionWithBuildsDto> {
    const row = await this.db.releaseVersion.findUnique({
      where: { id: releaseId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        builtVersions: {
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, versionId: true, createdAt: true },
        },
      },
    });

    if (!row) {
      throw new RestError(
        404,
        "NOT_FOUND",
        `Release version ${releaseId} not found`,
        {
          releaseId,
        },
      );
    }

    return {
      ...toReleaseVersionDto({
        id: row.id,
        name: row.name,
        createdAt: row.createdAt,
      }),
      builtVersions: mapToBuiltVersionDtos(row.builtVersions),
    };
  }
}
