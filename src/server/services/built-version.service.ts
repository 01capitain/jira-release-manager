import type { PrismaClient } from "@prisma/client";
import type { BuiltVersionDto } from "~/shared/types/built-version";
import { toBuiltVersionDto } from "~/server/zod/dto/built-version.dto";
import {
  validatePattern,
  expandPattern,
} from "~/server/services/component-version-naming.service";

export class BuiltVersionService {
  constructor(private readonly db: PrismaClient) {}

  async create(
    userId: string,
    versionId: string,
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
}
