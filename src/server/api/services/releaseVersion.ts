import { db } from "~/server/db";
import type { ReleaseVersion as PrismaReleaseVersion } from "@prisma/client";

export type ReleaseVersion = Readonly<{
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}>;

const toDomain = (m: PrismaReleaseVersion): ReleaseVersion => ({
  id: m.id,
  name: m.name,
  createdAt: m.createdAt,
  updatedAt: m.updatedAt,
});
export class ReleaseVersionService {
  public async create(data: { name: string }): Promise<ReleaseVersion> {
    const name = data.name?.trim();
    if (!name) throw new Error("name is required");
    const created = await db.releaseVersion.create({ data: { name } });
    return toDomain(created);
  }

  public async getOne(id: string): Promise<ReleaseVersion | null> {
    const found = await db.releaseVersion.findUnique({ where: { id } });
    return found ? toDomain(found) : null;
  }

  public async getAll(): Promise<ReleaseVersion[]> {
    const rows = await db.releaseVersion.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(toDomain);
  }

  public async delete(id: string): Promise<ReleaseVersion> {
    const deleted = await db.releaseVersion.delete({ where: { id } });
    return toDomain(deleted);
  }
}
