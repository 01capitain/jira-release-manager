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
import type {
  NormalizedPaginatedRequest,
  PaginatedResponse,
} from "~/shared/types/pagination";
import type { ReleaseVersionDefaultsDto } from "~/shared/types/release-version";
import type { ReleaseTrack } from "~/shared/types/release-track";
import { DEFAULT_RELEASE_TRACK } from "~/shared/types/release-track";
import type { ReleaseVersionRelationKey } from "~/shared/types/release-version-relations";
import { PatchService } from "~/server/services/patch.service";

type PatchTransitionRow = {
  id: string;
  patchId: string;
  fromStatus: string;
  toStatus: string;
  action: string;
  createdAt: Date;
  createdById: string;
};

type ComponentVersionRow = {
  id: string;
  releaseComponentId: string;
  patchId: string;
  name: string;
  increment: number;
  createdAt: Date;
};

type PatchRow = {
  id: string;
  name: string;
  versionId: string;
  createdAt: Date;
  currentStatus: string;
  componentVersions?: ComponentVersionRow[];
  PatchTransition?: PatchTransitionRow[];
};

export type ReleaseVersionRow = {
  id: string;
  name: string;
  releaseTrack: ReleaseTrack;
  createdAt: Date;
  createdBy?: {
    id: string;
    name: string | null;
    email: string | null;
  };
  patches?: PatchRow[];
};

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

  async list(
    params: NormalizedPaginatedRequest<"createdAt" | "name">,
    options?: { relations?: ReleaseVersionRelationKey[] },
  ): Promise<PaginatedResponse<ReleaseVersionRow>> {
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
    return buildPaginatedResponse(
      rows as ReleaseVersionRow[],
      page,
      pageSize,
      total,
    );
  }

  async create(
    userId: User["id"],
    nameOrInput: string | { name?: string; releaseTrack?: ReleaseTrack },
    options?: { logger?: ActionLogger },
  ): Promise<ReleaseVersionRow> {
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
      return release;
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
  ): Promise<ReleaseVersionRow> {
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

    return row as ReleaseVersionRow;
  }

  async updateReleaseTrack(
    releaseId: ReleaseVersion["id"],
    track: ReleaseTrack,
    userId: User["id"],
    options?: { logger?: ActionLogger },
  ): Promise<ReleaseVersionRow> {
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
  ): Promise<ReleaseVersionRow> {
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
      return existing;
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

      return updated;
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
