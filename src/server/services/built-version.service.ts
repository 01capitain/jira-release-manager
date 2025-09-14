import type { PrismaClient } from "@prisma/client";
import type { BuiltVersionDto } from "~/shared/types/built-version";
import { toBuiltVersionDto } from "~/server/zod/dto/built-version.dto";

export class BuiltVersionService {
  constructor(private readonly db: PrismaClient) {}

  async create(
    userId: string,
    versionId: string,
    name: string,
  ): Promise<BuiltVersionDto> {
    const created = await this.db.builtVersion.create({
      data: {
        name: name.trim(),
        version: { connect: { id: versionId } },
        createdBy: { connect: { id: userId } },
      },
      select: { id: true, name: true, versionId: true, createdAt: true },
    });
    return toBuiltVersionDto(created);
  }
}

