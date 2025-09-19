import type { PrismaClient } from "@prisma/client";
import { validatePattern, expandPattern } from "~/server/services/component-version-naming.service";

export class ComponentVersionService {
  constructor(private readonly db: PrismaClient) {}

  export type ComponentVersionCreateInput = {
    builtId: string;
    builtName: string;
    releaseName: string;
    componentId: string;
    namingPattern: string | null;
    increment: number;
  };

  async create(input: ComponentVersionService.ComponentVersionCreateInput) {
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
        } as any,
      },
    });
  }
}
