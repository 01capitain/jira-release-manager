import type {
  Prisma,
  PrismaClient,
  User,
  ReleaseVersion,
  BuiltVersion,
} from "@prisma/client";
import { BuiltVersionDefaultSelectionSchema } from "~/shared/schemas/built-version-selection";
import type { BuiltVersionDto } from "~/shared/types/built-version";
import type { BuiltVersionDefaultSelectionDto } from "~/shared/types/built-version-selection";
import {
  mapToBuiltVersionDtos,
  toBuiltVersionDto,
} from "~/server/zod/dto/built-version.dto";
import {
  validatePattern,
  expandPattern,
} from "~/server/services/component-version-naming.service";
import type {
  ActionLogger,
  SubactionInput,
} from "~/server/services/action-history.service";

type ReleaseComponentScopeDb = "global" | "version_bound";
type ComponentSeedRow = {
  id: string;
  name: string;
  namingPattern: string | null;
  releaseScope: ReleaseComponentScopeDb;
};

type TransactionClient = Prisma.TransactionClient;

type InternalCreateOptions = {
  tx: TransactionClient;
  userId: User["id"];
  versionId: ReleaseVersion["id"];
  name: string;
  seedMode: "global-only" | "all";
  builtSubactionType: "builtVersion.persist" | "builtVersion.autoCreate";
  componentSubactionType: "componentVersion.populate" | "componentVersion.seed";
  releaseNameOverride?: string;
};

type InternalCreateResult = {
  built: {
    id: string;
    name: string;
    versionId: string;
    createdAt: Date;
  };
  auditTrail: SubactionInput[];
  releaseName: string;
};

export class BuiltVersionService {
  constructor(private readonly db: PrismaClient) {}

  private async createWithTransaction({
    tx,
    userId,
    versionId,
    name,
    seedMode,
    builtSubactionType,
    componentSubactionType,
    releaseNameOverride,
  }: InternalCreateOptions): Promise<InternalCreateResult> {
    const auditTrail: SubactionInput[] = [];
    const trimmedName = name.trim();

    const releaseVersion =
      releaseNameOverride !== undefined
        ? { name: releaseNameOverride }
        : await tx.releaseVersion.findUniqueOrThrow({
            where: { id: versionId },
            select: { name: true },
          });

    const parsedIncrement = (() => {
      const parts = trimmedName.split(".");
      const lastPart = parts.at(-1);
      const maybeNumber = Number(lastPart);
      return Number.isFinite(maybeNumber) ? maybeNumber : 0;
    })();

    const built = await tx.builtVersion.create({
      data: {
        name: trimmedName,
        version: { connect: { id: versionId } },
        createdBy: { connect: { id: userId } },
        tokenValues: {
          release_version: releaseVersion.name,
          increment: parsedIncrement,
        } as Prisma.InputJsonValue,
      },
      select: { id: true, name: true, versionId: true, createdAt: true },
    });
    auditTrail.push({
      subactionType: builtSubactionType,
      message: `Built version ${built.name} created`,
      metadata: { id: built.id, versionId: built.versionId },
    });

    await this.seedComponents({
      tx,
      built,
      releaseName: releaseVersion.name,
      seedMode,
      componentSubactionType,
      auditTrail,
    });

    return {
      built,
      auditTrail,
      releaseName: releaseVersion.name,
    };
  }

  private async seedComponents({
    tx,
    built,
    releaseName,
    seedMode,
    componentSubactionType,
    auditTrail,
  }: {
    tx: TransactionClient;
    built: { id: string; name: string };
    releaseName: string;
    seedMode: "global-only" | "all";
    componentSubactionType:
      | "componentVersion.populate"
      | "componentVersion.seed";
    auditTrail: SubactionInput[];
  }): Promise<void> {
    const releaseComponentDelegate = tx.releaseComponent as unknown as {
      findMany(args?: unknown): Promise<ComponentSeedRow[]>;
    };
    const components = await releaseComponentDelegate.findMany({
      select: {
        id: true,
        name: true,
        namingPattern: true,
        releaseScope: true,
      },
    });

    if (components.length === 0) {
      return;
    }

    for (const comp of components) {
      if (!comp.namingPattern?.trim()) continue;
      const { valid } = validatePattern(comp.namingPattern);
      if (!valid) continue;

      if (seedMode === "all") {
        const componentIncrement = 0;
        const computedName = expandPattern(comp.namingPattern, {
          releaseVersion: releaseName,
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
              release_version: releaseName,
              built_version: built.name,
              increment: componentIncrement,
            } as Prisma.InputJsonValue,
          },
        });
        auditTrail.push({
          subactionType: componentSubactionType,
          message: `Seeded ${comp.name} for ${built.name}`,
          metadata: {
            releaseComponentId: comp.id,
            builtVersionId: built.id,
          },
        });
        continue;
      }

      if (comp.releaseScope !== "global") continue;

      const latest = await tx.componentVersion.findFirst({
        where: { builtVersionId: built.id, releaseComponentId: comp.id },
        orderBy: { increment: "desc" },
        select: { increment: true },
      });
      const nextIncrement = latest ? latest.increment + 1 : 0;
      const computedName = expandPattern(comp.namingPattern, {
        releaseVersion: releaseName,
        builtVersion: built.name,
        nextIncrement,
      });
      await tx.componentVersion.create({
        data: {
          name: computedName,
          increment: nextIncrement,
          releaseComponent: { connect: { id: comp.id } },
          builtVersion: { connect: { id: built.id } },
          tokenValues: {
            release_version: releaseName,
            built_version: built.name,
            increment: nextIncrement,
          } as Prisma.InputJsonValue,
        },
      });
      auditTrail.push({
        subactionType: componentSubactionType,
        message: `Populated ${comp.name} for ${built.name}`,
        metadata: { releaseComponentId: comp.id, builtVersionId: built.id },
      });
    }
  }

  async create(
    userId: User["id"],
    versionId: ReleaseVersion["id"],
    name: string,
    options?: { logger?: ActionLogger },
  ): Promise<BuiltVersionDto> {
    const { built, auditTrail } = await this.db.$transaction((tx) =>
      this.createWithTransaction({
        tx,
        userId,
        versionId,
        name,
        seedMode: "global-only",
        builtSubactionType: "builtVersion.persist",
        componentSubactionType: "componentVersion.populate",
      }),
    );
    if (options?.logger) {
      for (const entry of auditTrail) {
        await options.logger.subaction(entry);
      }
    }
    return toBuiltVersionDto(built);
  }

  async createInitialForRelease(
    tx: TransactionClient,
    params: {
      userId: User["id"];
      releaseId: ReleaseVersion["id"];
      releaseName: string;
      builtName: string;
    },
  ): Promise<{
    built: {
      id: string;
      name: string;
      versionId: string;
      createdAt: Date;
    };
    auditTrail: SubactionInput[];
  }> {
    const result = await this.createWithTransaction({
      tx,
      userId: params.userId,
      versionId: params.releaseId,
      name: params.builtName,
      seedMode: "all",
      releaseNameOverride: params.releaseName,
      builtSubactionType: "builtVersion.autoCreate",
      componentSubactionType: "componentVersion.seed",
    });
    return { built: result.built, auditTrail: result.auditTrail };
  }

  async listByRelease(
    versionId: ReleaseVersion["id"],
  ): Promise<BuiltVersionDto[]> {
    const rows = await this.db.builtVersion.findMany({
      where: { versionId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, versionId: true, createdAt: true },
    });
    return mapToBuiltVersionDtos(rows);
  }

  async getDefaultSelection(
    builtVersionId: BuiltVersion["id"],
  ): Promise<BuiltVersionDefaultSelectionDto> {
    const built = await this.db.builtVersion.findUniqueOrThrow({
      where: { id: builtVersionId },
      select: { id: true, versionId: true },
    });

    const releaseComponentDelegate = this.db.releaseComponent as unknown as {
      findMany(args?: unknown): Promise<Array<{ id: string }>>;
    };
    const globalComponents = await releaseComponentDelegate.findMany({
      where: { releaseScope: "global" },
      select: { id: true },
    });
    const globalComponentIds = new Set(
      globalComponents.map((component) => component.id),
    );

    const builds = await this.db.builtVersion.findMany({
      where: { versionId: built.versionId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    const buildIds = builds.map((b) => b.id);

    const transitions = await this.db.builtVersionTransition.findMany({
      where: { builtVersionId: { in: buildIds } },
      orderBy: { createdAt: "desc" },
      select: { builtVersionId: true, toStatus: true, createdAt: true },
    });

    const latestByBuild = new Map<string, string>();
    for (const transition of transitions) {
      if (!latestByBuild.has(transition.builtVersionId)) {
        latestByBuild.set(transition.builtVersionId, transition.toStatus);
      }
    }

    const activeBuiltId =
      builds.find((entry) => latestByBuild.get(entry.id) === "active")?.id ??
      null;

    if (!activeBuiltId) {
      return BuiltVersionDefaultSelectionSchema.parse({
        selectedReleaseComponentIds: Array.from(globalComponentIds),
      });
    }

    const selectedRows = await this.db.componentVersion.findMany({
      where: { builtVersionId: activeBuiltId },
      select: { releaseComponentId: true },
    });
    const uniqueComponentIds = Array.from(
      new Set(selectedRows.map((row) => row.releaseComponentId)),
    );
    for (const id of globalComponentIds) {
      if (!uniqueComponentIds.includes(id)) {
        uniqueComponentIds.push(id);
      }
    }

    return BuiltVersionDefaultSelectionSchema.parse({
      selectedReleaseComponentIds: uniqueComponentIds,
    });
  }
}
