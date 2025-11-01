import type {
  Prisma,
  PrismaClient,
  ReleaseVersion,
  User,
} from "@prisma/client";
import { RestError } from "~/server/rest/errors";
import { buildPaginatedResponse } from "~/server/rest/pagination";
import type {
  ActionLogger,
  SubactionInput,
} from "~/server/services/action-history.service";
import {
  buildReleaseVersionRelationState,
  type ReleaseVersionRelationState,
} from "~/server/services/release-version.relations";
import { mapToBuiltVersionTransitionDtos } from "~/server/zod/dto/built-version-transition.dto";
import { toBuiltVersionDto } from "~/server/zod/dto/built-version.dto";
import { mapToComponentVersionDtos } from "~/server/zod/dto/component-version.dto";
import { toReleaseVersionDto } from "~/server/zod/dto/release-version.dto";
import { toUserSummaryDto } from "~/server/zod/dto/user.dto";
import type {
  NormalizedPaginatedRequest,
  PaginatedResponse,
} from "~/shared/types/pagination";
import type { ReleaseVersionDto } from "~/shared/types/release-version";
import type {
  BuiltVersionWithRelationsDto,
  ReleaseVersionRelationKey,
  ReleaseVersionWithRelationsDto,
} from "~/shared/types/release-version-relations";

export class ReleaseVersionService {
  constructor(private readonly db: PrismaClient) {}

  private buildRelationsInclude(
    state: ReleaseVersionRelationState,
  ): Prisma.ReleaseVersionInclude | undefined {
    const include: Prisma.ReleaseVersionInclude = {};
    if (state.includeCreater) {
      include.createdBy = {
        select: { id: true, name: true, email: true },
      };
    }
    if (state.includeBuiltVersions) {
      const builtSelect: Prisma.BuiltVersionSelect = {
        id: true,
        name: true,
        versionId: true,
        createdAt: true,
      };
      if (state.includeBuiltVersionComponents) {
        builtSelect.componentVersions = {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            releaseComponentId: true,
            builtVersionId: true,
            name: true,
            increment: true,
            createdAt: true,
          },
        };
      }
      if (state.includeBuiltVersionTransitions) {
        builtSelect.BuiltVersionTransition = {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            builtVersionId: true,
            fromStatus: true,
            toStatus: true,
            action: true,
            createdAt: true,
            createdById: true,
          },
        };
      }
      include.builtVersions = {
        orderBy: { createdAt: "desc" },
        select: builtSelect,
      };
    }
    return Object.keys(include).length > 0 ? include : undefined;
  }

  private mapBuiltVersion(
    row: unknown,
    state: ReleaseVersionRelationState,
  ): BuiltVersionWithRelationsDto {
    const base = toBuiltVersionDto(row);
    const typed = row as {
      componentVersions?: unknown[];
      BuiltVersionTransition?: unknown[];
    };
    const result: BuiltVersionWithRelationsDto = { ...base };
    if (
      state.includeBuiltVersionComponents &&
      Array.isArray(typed.componentVersions)
    ) {
      result.deployedComponents = mapToComponentVersionDtos(
        typed.componentVersions,
      );
    }
    if (
      state.includeBuiltVersionTransitions &&
      Array.isArray(typed.BuiltVersionTransition)
    ) {
      result.transitions = mapToBuiltVersionTransitionDtos(
        typed.BuiltVersionTransition,
      );
    }
    return result;
  }

  private mapReleaseVersion(
    row: unknown,
    state: ReleaseVersionRelationState,
  ): ReleaseVersionWithRelationsDto {
    const base = toReleaseVersionDto(row);
    const typed = row as {
      createdBy?: unknown;
      builtVersions?: unknown[];
    };
    const result: ReleaseVersionWithRelationsDto = { ...base };
    if (state.includeCreater && typed.createdBy) {
      result.creater = toUserSummaryDto(typed.createdBy);
    }
    if (state.includeBuiltVersions && Array.isArray(typed.builtVersions)) {
      result.builtVersions = typed.builtVersions.map((built) =>
        this.mapBuiltVersion(built, state),
      );
    }
    return result;
  }

  async list(
    params: NormalizedPaginatedRequest<"createdAt" | "name">,
    options?: { relations?: ReleaseVersionRelationKey[] },
  ): Promise<PaginatedResponse<ReleaseVersionWithRelationsDto>> {
    const { page, pageSize, sortBy } = params;
    const isDescending = sortBy.startsWith("-");
    const sortField = (isDescending ? sortBy.slice(1) : sortBy) as
      | "createdAt"
      | "name";
    const orderDirection = (isDescending ? "desc" : "asc") as Prisma.SortOrder;
    const orderBy: Prisma.ReleaseVersionOrderByWithRelationInput = {
      [sortField]: orderDirection,
    };
    const state = buildReleaseVersionRelationState(options?.relations ?? []);
    const include = this.buildRelationsInclude(state);
    const findManyArgs: Prisma.ReleaseVersionFindManyArgs = {
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    };
    if (include) {
      findManyArgs.include = include;
    } else {
      findManyArgs.select = { id: true, name: true, createdAt: true };
    }
    const [total, rows] = await Promise.all([
      this.db.releaseVersion.count(),
      this.db.releaseVersion.findMany(findManyArgs),
    ]);
    const items = rows.map((row) => this.mapReleaseVersion(row, state));
    return buildPaginatedResponse(items, page, pageSize, total);
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
      const releaseComponentDelegate = tx.releaseComponent as unknown as {
        findMany(args?: unknown): Promise<
          Array<{
            id: string;
            namingPattern: string | null;
          }>
        >;
      };
      const components = await releaseComponentDelegate.findMany({
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
          await tx.componentVersion.upsert({
            where: {
              builtVersionId_releaseComponentId: {
                builtVersionId: built.id,
                releaseComponentId: comp.id,
              },
            },
            update: {},
            create: {
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

  async getById(
    releaseId: ReleaseVersion["id"],
    options?: { relations?: ReleaseVersionRelationKey[] },
  ): Promise<ReleaseVersionWithRelationsDto> {
    const state = buildReleaseVersionRelationState(options?.relations ?? []);
    const include = this.buildRelationsInclude(state);
    const findUniqueArgs: Prisma.ReleaseVersionFindUniqueArgs = {
      where: { id: releaseId },
    };
    if (include) {
      findUniqueArgs.include = include;
    } else {
      findUniqueArgs.select = { id: true, name: true, createdAt: true };
    }
    const row = await this.db.releaseVersion.findUnique(findUniqueArgs);

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

    return this.mapReleaseVersion(row, state);
  }
}
