import type { PrismaClient } from "@prisma/client";
import type { ReleaseVersionDto } from "~/shared/types/release-version";
import {
  mapToReleaseVersionDtos,
  toReleaseVersionDto,
} from "~/server/zod/dto/release-version.dto";
import type { ReleaseVersionWithBuildsDto } from "~/shared/types/release-version-with-builds";
import { mapToBuiltVersionDtos } from "~/server/zod/dto/built-version.dto";

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

  async create(userId: string, name: string): Promise<ReleaseVersionDto> {
    const created = await this.db.releaseVersion.create({
      data: {
        name: name.trim(),
        createdBy: { connect: { id: userId } },
      },
      select: { id: true, name: true, createdAt: true },
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
      ...toReleaseVersionDto({ id: r.id, name: r.name, createdAt: r.createdAt }),
      builtVersions: mapToBuiltVersionDtos(r.builtVersions as unknown[]),
    }));
  }
}
