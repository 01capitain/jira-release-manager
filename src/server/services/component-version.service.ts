import type { PrismaClient, Prisma, BuiltVersion } from "@prisma/client";
import type { ComponentVersionDto } from "~/shared/types/component-version";
import { mapToComponentVersionDtos } from "~/server/zod/dto/component-version.dto";
import { validatePattern, expandPattern } from "~/server/services/component-version-naming.service";

export class ComponentVersionService {
  constructor(private readonly db: PrismaClient) {}

  async create(input: ComponentVersionCreateInput) {
    const { builtId, builtName, releaseName, componentId, namingPattern, increment } = input;
    if (!namingPattern?.trim()) return null;
    const { valid } = validatePattern(namingPattern);
    if (!valid) return null;
    const computedName = expandPattern(namingPattern, {
      releaseVersion: releaseName,
      builtVersion: builtName,
      nextIncrement: increment,
    });
    return this.db.componentVersion.create({
      data: {
        name: computedName,
        increment,
        releaseComponent: { connect: { id: componentId } },
        builtVersion: { connect: { id: builtId } },
        tokenValues: {
          release_version: releaseName,
          built_version: builtName,
          increment,
        } as Prisma.InputJsonValue,
      },
    });
  }

  async listByBuilt(
    builtVersionId: BuiltVersion["id"],
  ): Promise<ComponentVersionDto[]> {
    const rows = await this.db.componentVersion.findMany({
      where: { builtVersionId },
      orderBy: [{ releaseComponentId: "asc" }, { increment: "asc" }],
      select: {
        id: true,
        releaseComponentId: true,
        builtVersionId: true,
        name: true,
        increment: true,
        createdAt: true,
      },
    });
    return mapToComponentVersionDtos(rows);
  }
}

export type ComponentVersionCreateInput = {
  builtId: string;
  builtName: string;
  releaseName: string;
  componentId: string;
  namingPattern: string | null;
  increment: number;
};
