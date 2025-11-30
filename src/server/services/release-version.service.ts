import {
  Prisma,
  type PrismaClient,
  type ReleaseVersion,
  type User,
} from "@prisma/client";
import { RestError } from "~/server/rest/errors";
import { buildPaginatedResponse } from "~/server/rest/pagination";
import type {
  ActionLogger,
  SubactionInput,
} from "~/server/services/action-history.service";
import { ReleaseVersionDefaultsService } from "~/server/services/release-version-defaults.service";
import {
  buildReleaseVersionRelationState,
  type ReleaseVersionRelationState,
} from "~/server/services/release-version.relations";
import { mapToPatchTransitionDtos } from "~/server/zod/dto/patch-transition.dto";
import { toPatchDto } from "~/server/zod/dto/patch.dto";
import { mapToComponentVersionDtos } from "~/server/zod/dto/component-version.dto";
import { toReleaseVersionDto } from "~/server/zod/dto/release-version.dto";
import { toUserSummaryDto } from "~/server/zod/dto/user.dto";
import type {
  NormalizedPaginatedRequest,
  PaginatedResponse,
} from "~/shared/types/pagination";
import type {
  ReleaseVersionDefaultsDto,
  ReleaseVersionDto,
} from "~/shared/types/release-version";
import type { ReleaseTrack } from "~/shared/types/release-track";
import { DEFAULT_RELEASE_TRACK } from "~/shared/types/release-track";
import type {
  PatchWithRelationsDto,
  ReleaseVersionRelationKey,
  ReleaseVersionWithRelationsDto,
} from "~/shared/types/release-version-relations";
import { PatchService } from "~/server/services/patch.service";

export class ReleaseVersionService {
  constructor(
    private readonly db: PrismaClient,
    private readonly patchService: PatchService = new PatchService(db),
    private readonly defaultsService = new ReleaseVersionDefaultsService(),
  ) {}

  async proposeDefaults(): Promise<ReleaseVersionDefaultsDto> {
    return this.defaultsService.calculateDefaultsForLatest(this);
  }

  async getLatestRelease(): Promise<ReleaseVersion | null> {
    const [latest] = await this.db.releaseVersion.findMany({
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    return latest ?? null;
  }

  private buildRelationsInclude(
    state: ReleaseVersionRelationState,
  ): Prisma.ReleaseVersionInclude | undefined {
    const include: Prisma.ReleaseVersionInclude = {};
    if (state.includeCreater) {
      include.createdBy = {
        select: { id: true, name: true, email: true },
      };
    }
    if (state.includePatches) {
      const patchSelect: Prisma.PatchSelect = {
        id: true,
        name: true,
        versionId: true,
        currentStatus: true,
        createdAt: true,
      };
      if (state.includePatchComponents) {
        patchSelect.componentVersions = {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            releaseComponentId: true,
            patchId: true,
            name: true,
            increment: true,
            createdAt: true,
          },
        };
      }
      if (state.includePatchTransitions) {
        patchSelect.PatchTransition = {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            patchId: true,
            fromStatus: true,
            toStatus: true,
            action: true,
            createdAt: true,
            createdById: true,
          },
        };
      }
      include.patches = {
        orderBy: { createdAt: "desc" },
        select: patchSelect,
      };
    }
    return Object.keys(include).length > 0 ? include : undefined;
  }

  private mapPatch(
    row: unknown,
    state: ReleaseVersionRelationState,
  ): PatchWithRelationsDto {
    const base = toPatchDto(row);
    const typed = row as {
      componentVersions?: unknown[];
      PatchTransition?: unknown[];
    };
    const result: PatchWithRelationsDto = { ...base };
    if (
      state.includePatchComponents &&
      Array.isArray(typed.componentVersions)
    ) {
      result.deployedComponents = mapToComponentVersionDtos(
        typed.componentVersions,
      );
    }
    if (state.includePatchTransitions && Array.isArray(typed.PatchTransition)) {
      result.transitions = mapToPatchTransitionDtos(typed.PatchTransition);
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
      patches?: unknown[];
    };
    const result: ReleaseVersionWithRelationsDto = { ...base };
    if (state.includeCreater && typed.createdBy) {
      result.creater = toUserSummaryDto(typed.createdBy);
    }
    if (state.includePatches && Array.isArray(typed.patches)) {
      result.patches = typed.patches.map((patch) =>
        this.mapPatch(patch, state),
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
      findManyArgs.select = {
        id: true,
        name: true,
        releaseTrack: true,
        createdAt: true,
      };
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
    nameOrInput: string | { name?: string; releaseTrack?: ReleaseTrack },
    options?: { logger?: ActionLogger },
  ): Promise<ReleaseVersionDto> {
    const input =
      typeof nameOrInput === "string"
        ? { name: nameOrInput }
        : (nameOrInput ?? {});
    const providedName = input.name?.trim();
    if (input.name !== undefined && !providedName) {
      throw new RestError(400, "VALIDATION_ERROR", "Name is required");
    }
    const needsDefaults =
      input.name === undefined || input.releaseTrack === undefined;
    const defaults = needsDefaults ? await this.proposeDefaults() : undefined;
    const releaseName = providedName ?? defaults?.name;
    const releaseTrack =
      input.releaseTrack ?? defaults?.releaseTrack ?? DEFAULT_RELEASE_TRACK;
    if (!releaseName) {
      throw new RestError(
        500,
        "DEFAULT_NAME_UNAVAILABLE",
        "Unable to determine a release name",
      );
    }

    const auditTrail: SubactionInput[] = [];
    try {
      const release = await this.db.$transaction(async (tx) => {
        const release = await tx.releaseVersion.create({
          data: {
            name: releaseName,
            releaseTrack,
            createdBy: { connect: { id: userId } },
          },
          select: { id: true, name: true, releaseTrack: true, createdAt: true },
        });
        auditTrail.push({
          subactionType: "releaseVersion.persist",
          message: `Release ${release.name} stored`,
          metadata: { id: release.id },
        });
        const patchIncrement = 0;
        const patchName = `${release.name}.${patchIncrement}`;
        const { auditTrail: patchTrail } =
          await this.patchService.createInitialForRelease(tx, {
            userId,
            releaseId: release.id,
            releaseName: release.name,
            patchName,
          });
        auditTrail.push(...patchTrail);

        await tx.releaseVersion.update({
          where: { id: release.id },
          data: { lastUsedIncrement: patchIncrement },
        });

        return release;
      });
      if (options?.logger) {
        for (const entry of auditTrail) {
          await options.logger.subaction(entry);
        }
      }
      return toReleaseVersionDto(release);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new RestError(409, "RELEASE_EXISTS", "Release already exists", {
          name: releaseName,
        });
      }
      throw error;
    }
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
      findUniqueArgs.select = {
        id: true,
        name: true,
        releaseTrack: true,
        createdAt: true,
      };
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

  async updateReleaseTrack(
    releaseId: ReleaseVersion["id"],
    track: ReleaseTrack,
    userId: User["id"],
    options?: { logger?: ActionLogger },
  ): Promise<ReleaseVersionDto> {
    return this.updateRelease(
      releaseId,
      { releaseTrack: track },
      userId,
      options,
    );
  }

  async updateRelease(
    releaseId: ReleaseVersion["id"],
    input: { name?: string; releaseTrack?: ReleaseTrack },
    userId: User["id"],
    options?: { logger?: ActionLogger },
  ): Promise<ReleaseVersionDto> {
    const existing = await this.db.releaseVersion.findUnique({
      where: { id: releaseId },
      select: { id: true, name: true, releaseTrack: true, createdAt: true },
    });
    if (!existing) {
      throw new RestError(
        404,
        "NOT_FOUND",
        `Release version ${releaseId} not found`,
        { releaseId },
      );
    }
    const trimmedName = input.name?.trim();
    if (input.name !== undefined && !trimmedName) {
      throw new RestError(400, "VALIDATION_ERROR", "Name is required");
    }

    const updates: Prisma.ReleaseVersionUpdateInput = {};
    if (trimmedName && trimmedName !== existing.name) {
      updates.name = trimmedName;
    }
    const desiredTrack = input.releaseTrack ?? existing.releaseTrack;
    if (desiredTrack !== existing.releaseTrack) {
      updates.releaseTrack = desiredTrack;
    }

    if (Object.keys(updates).length === 0) {
      return toReleaseVersionDto(existing);
    }

    try {
      const updated = await this.db.releaseVersion.update({
        where: { id: releaseId },
        data: updates,
        select: { id: true, name: true, releaseTrack: true, createdAt: true },
      });

      if (options?.logger) {
        if (updates.name) {
          await options.logger.subaction({
            subactionType: "releaseVersion.rename",
            message: `Release ${existing.name} renamed to ${updated.name}`,
            metadata: {
              releaseId,
              updatedBy: userId,
              from: existing.name,
              to: updated.name,
            },
          });
        }
        if (updates.releaseTrack) {
          await options.logger.subaction({
            subactionType: "releaseVersion.track.update",
            message: `Release ${updated.name} track updated`,
            metadata: {
              releaseId,
              updatedBy: userId,
              from: existing.releaseTrack,
              to: updated.releaseTrack,
            },
          });
        }
      }

      return toReleaseVersionDto(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new RestError(409, "RELEASE_EXISTS", "Release already exists", {
          releaseId,
          name: trimmedName,
        });
      }
      throw error;
    }
  }
}
