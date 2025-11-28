import type {
  Prisma,
  PrismaClient,
  User,
  ReleaseVersion,
  Patch,
} from "@prisma/client";
import { PatchDefaultSelectionSchema } from "~/shared/schemas/patch-selection";
import type { PatchDto } from "~/shared/types/patch";
import type { PatchDefaultSelectionDto } from "~/shared/types/patch-selection";
import { mapToPatchDtos, toPatchDto } from "~/server/zod/dto/patch.dto";
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
  patchSubactionType: "patch.persist" | "patch.autoCreate";
  componentSubactionType: "componentVersion.populate" | "componentVersion.seed";
  releaseNameOverride?: string;
};

type InternalCreateResult = {
  patch: {
    id: string;
    name: string;
    versionId: string;
    currentStatus: string;
    createdAt: Date;
  };
  auditTrail: SubactionInput[];
  releaseName: string;
};

export class PatchService {
  constructor(private readonly db: PrismaClient) {}

  private async createWithTransaction({
    tx,
    userId,
    versionId,
    name,
    seedMode,
    patchSubactionType,
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

    const patch = await tx.patch.create({
      data: {
        name: trimmedName,
        version: { connect: { id: versionId } },
        createdBy: { connect: { id: userId } },
        tokenValues: {
          release_version: releaseVersion.name,
          increment: parsedIncrement,
        } as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        name: true,
        versionId: true,
        createdAt: true,
        currentStatus: true,
      },
    });
    auditTrail.push({
      subactionType: patchSubactionType,
      message: `Patch ${patch.name} created`,
      metadata: { id: patch.id, versionId: patch.versionId },
    });

    await this.seedComponents({
      tx,
      patch,
      releaseName: releaseVersion.name,
      seedMode,
      componentSubactionType,
      auditTrail,
    });

    return {
      patch,
      auditTrail,
      releaseName: releaseVersion.name,
    };
  }

  private async seedComponents({
    tx,
    patch,
    releaseName,
    seedMode,
    componentSubactionType,
    auditTrail,
  }: {
    tx: TransactionClient;
    patch: { id: string; name: string };
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
          patch: patch.name,
          nextIncrement: componentIncrement,
        });
        await tx.componentVersion.upsert({
          where: {
            patchId_releaseComponentId: {
              patchId: patch.id,
              releaseComponentId: comp.id,
            },
          },
          update: {},
          create: {
            name: computedName,
            increment: componentIncrement,
            releaseComponent: { connect: { id: comp.id } },
            patch: { connect: { id: patch.id } },
            tokenValues: {
              release_version: releaseName,
              patch: patch.name,
              increment: componentIncrement,
            } as Prisma.InputJsonValue,
          },
        });
        auditTrail.push({
          subactionType: componentSubactionType,
          message: `Seeded ${comp.name} for ${patch.name}`,
          metadata: {
            releaseComponentId: comp.id,
            patchId: patch.id,
          },
        });
        continue;
      }

      if (comp.releaseScope !== "global") continue;

      const latest = await tx.componentVersion.findFirst({
        where: { patchId: patch.id, releaseComponentId: comp.id },
        orderBy: { increment: "desc" },
        select: { increment: true },
      });
      const nextIncrement = latest ? latest.increment + 1 : 0;
      const computedName = expandPattern(comp.namingPattern, {
        releaseVersion: releaseName,
        patch: patch.name,
        nextIncrement,
      });
      await tx.componentVersion.create({
        data: {
          name: computedName,
          increment: nextIncrement,
          releaseComponent: { connect: { id: comp.id } },
          patch: { connect: { id: patch.id } },
          tokenValues: {
            release_version: releaseName,
            patch: patch.name,
            increment: nextIncrement,
          } as Prisma.InputJsonValue,
        },
      });
      auditTrail.push({
        subactionType: componentSubactionType,
        message: `Populated ${comp.name} for ${patch.name}`,
        metadata: { releaseComponentId: comp.id, patchId: patch.id },
      });
    }
  }

  async create(
    userId: User["id"],
    versionId: ReleaseVersion["id"],
    name: string,
    options?: { logger?: ActionLogger },
  ): Promise<PatchDto> {
    const { patch, auditTrail } = await this.db.$transaction((tx) =>
      this.createWithTransaction({
        tx,
        userId,
        versionId,
        name,
        seedMode: "global-only",
        patchSubactionType: "patch.persist",
        componentSubactionType: "componentVersion.populate",
      }),
    );
    if (options?.logger) {
      for (const entry of auditTrail) {
        await options.logger.subaction(entry);
      }
    }
    return toPatchDto(patch);
  }

  async createInitialForRelease(
    tx: TransactionClient,
    params: {
      userId: User["id"];
      releaseId: ReleaseVersion["id"];
      releaseName: string;
      patchName: string;
    },
  ): Promise<{
    patch: {
      id: string;
      name: string;
      versionId: string;
      currentStatus: string;
      createdAt: Date;
    };
    auditTrail: SubactionInput[];
  }> {
    const result = await this.createWithTransaction({
      tx,
      userId: params.userId,
      versionId: params.releaseId,
      name: params.patchName,
      seedMode: "all",
      releaseNameOverride: params.releaseName,
      patchSubactionType: "patch.autoCreate",
      componentSubactionType: "componentVersion.seed",
    });
    return { patch: result.patch, auditTrail: result.auditTrail };
  }

  async listByRelease(versionId: ReleaseVersion["id"]): Promise<PatchDto[]> {
    const rows = await this.db.patch.findMany({
      where: { versionId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        versionId: true,
        currentStatus: true,
        createdAt: true,
      },
    });
    return mapToPatchDtos(rows);
  }

  async getDefaultSelection(
    patchId: Patch["id"],
  ): Promise<PatchDefaultSelectionDto> {
    const patch = await this.db.patch.findUniqueOrThrow({
      where: { id: patchId },
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

    const patches = await this.db.patch.findMany({
      where: { versionId: patch.versionId },
      orderBy: { createdAt: "desc" },
      select: { id: true, currentStatus: true },
    });

    const activePatchId =
      patches.find((entry) => entry.currentStatus === "active")?.id ?? null;

    if (!activePatchId) {
      return PatchDefaultSelectionSchema.parse({
        selectedReleaseComponentIds: Array.from(globalComponentIds),
      });
    }

    const selectedRows = await this.db.componentVersion.findMany({
      where: { patchId: activePatchId },
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

    return PatchDefaultSelectionSchema.parse({
      selectedReleaseComponentIds: uniqueComponentIds,
    });
  }
}
