import { db } from "~/server/db";
import { type ReleaseVersion } from "@prisma/client";

export class ReleaseVersionService {
  public async create(data: {
    name: string;
  }): Promise<ReleaseVersion> {
    return db.releaseVersion.create({ data });
  }

  public async getOne(id: string): Promise<ReleaseVersion | null> {
    return db.releaseVersion.findUnique({ where: { id } });
  }

  public async getAll(): Promise<ReleaseVersion[]> {
    return db.releaseVersion.findMany();
  }

  public async delete(id: string): Promise<ReleaseVersion> {
    return db.releaseVersion.delete({ where: { id } });
  }
}
