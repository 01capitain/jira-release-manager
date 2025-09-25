import type { Prisma, PrismaClient, User } from "@prisma/client";
import { mapToBuiltVersionDtos } from "~/server/zod/dto/built-version.dto";
import {
  mapToReleaseVersionDtos,
  toReleaseVersionDto,
} from "~/server/zod/dto/release-version.dto";
import type { ReleaseVersionDto } from "~/shared/types/release-version";
import type { ReleaseVersionWithBuildsDto } from "~/shared/types/release-version-with-builds";

export class ReleaseVersionService {
  constructor(private readonly db: PrismaClient) {}

  async list(
    page: number,
    pageSize: number,
  ): Promise<{ total: number; items: ReleaseVersionDto[] }> {
    const [total, rows] = await Promise.all([
      this.db.releaseVersion.count(),
      this.db.releaseVersion.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, createdAt: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { total, items: mapToReleaseVersionDtos(rows) };
  }

  async create(userId: User["id"], name: string): Promise<ReleaseVersionDto> {
    const created = await this.db.$transaction(async (tx) => {
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
        }
      }

      return release;
    });
    return toReleaseVersionDto(created);
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
}
