import type { PrismaClient, Prisma, Patch } from "@prisma/client";
import type { ComponentVersionDto } from "~/shared/types/component-version";
import { mapToComponentVersionDtos } from "~/server/zod/dto/component-version.dto";
import {
  validatePattern,
  expandPattern,
} from "~/server/services/component-version-naming.service";

export class ComponentVersionService {
  constructor(private readonly db: PrismaClient) {}

  async create(input: ComponentVersionCreateInput) {
    const {
      patchId,
      patchName,
      releaseName,
      componentId,
      namingPattern,
      increment,
    } = input;
    if (!namingPattern?.trim()) return null;
    const { valid } = validatePattern(namingPattern);
    if (!valid) return null;
    const computedName = expandPattern(namingPattern, {
      releaseVersion: releaseName,
      patch: patchName,
      nextIncrement: increment,
    });
    return this.db.componentVersion.create({
      data: {
        name: computedName,
        increment,
        releaseComponent: { connect: { id: componentId } },
        patch: { connect: { id: patchId } },
        tokenValues: {
          release_version: releaseName,
          patch: patchName,
          increment,
        } as Prisma.InputJsonValue,
      },
    });
  }

  async listByPatch(patchId: Patch["id"]): Promise<ComponentVersionDto[]> {
    const rows = await this.db.componentVersion.findMany({
      where: { patchId },
      orderBy: [{ releaseComponentId: "asc" }, { increment: "asc" }],
      select: {
        id: true,
        releaseComponentId: true,
        patchId: true,
        name: true,
        increment: true,
        createdAt: true,
      },
    });
    return mapToComponentVersionDtos(rows);
  }
}

export type ComponentVersionCreateInput = {
  patchId: string;
  patchName: string;
  releaseName: string;
  componentId: string;
  namingPattern: string | null;
  increment: number;
};
