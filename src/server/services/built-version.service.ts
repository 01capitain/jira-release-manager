import type {
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

export class BuiltVersionService {
  constructor(private readonly db: PrismaClient) {}

  async create(
    userId: User["id"],
    versionId: ReleaseVersion["id"],
    name: string,
  ): Promise<BuiltVersionDto> {
    const created = await this.db.$transaction(async (tx) => {
      const built = await tx.builtVersion.create({
        data: {
          name: name.trim(),
          version: { connect: { id: versionId } },
          createdBy: { connect: { id: userId } },
        },
        select: { id: true, name: true, versionId: true, createdAt: true },
      });

      // Fetch the release version for token expansion
      const releaseVersion = await tx.releaseVersion.findUniqueOrThrow({
        where: { id: versionId },
        select: { name: true },
      });

      // Fetch all release components
      const components = await tx.releaseComponent.findMany({
        select: { id: true, namingPattern: true },
      });

      if (components.length > 0) {
        for (const comp of components) {
          if (!comp.namingPattern?.trim()) continue;
          const { valid } = validatePattern(comp.namingPattern);
          if (!valid) continue; // skip invalid patterns defensively
          // Increment scope: per Built Version for this component, starting at 0
          const latest = await tx.componentVersion.findFirst({
            where: { builtVersionId: built.id, releaseComponentId: comp.id },
            orderBy: { increment: "desc" },
            select: { increment: true },
          });
          const nextIncrement = latest ? latest.increment + 1 : 0;
          const computedName = expandPattern(comp.namingPattern, {
            releaseVersion: releaseVersion.name,
            builtVersion: built.name,
            nextIncrement,
          });
          await tx.componentVersion.create({
            data: {
              name: computedName,
              increment: nextIncrement,
              releaseComponent: { connect: { id: comp.id } },
              builtVersion: { connect: { id: built.id } },
            },
          });
        }
      }

      return built;
    });
    return toBuiltVersionDto(created);
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
      builds.find((entry) => latestByBuild.get(entry.id) === "active")?.id ?? null;

    if (!activeBuiltId) {
      const components = await this.db.releaseComponent.findMany({
        select: { id: true },
      });
      return BuiltVersionDefaultSelectionSchema.parse({
        selectedReleaseComponentIds: components.map((component) => component.id),
      });
    }

    const selectedRows = await this.db.componentVersion.findMany({
      where: { builtVersionId: activeBuiltId },
      select: { releaseComponentId: true },
    });
    const uniqueComponentIds = Array.from(
      new Set(selectedRows.map((row) => row.releaseComponentId)),
    );

    return BuiltVersionDefaultSelectionSchema.parse({
      selectedReleaseComponentIds: uniqueComponentIds,
    });
  }
}
