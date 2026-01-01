import type { JiraReleaseStatus, PrismaClient } from "@prisma/client";
import { RestError } from "~/server/rest/errors";
import type { JiraVersion } from "~/server/services/jira-version.service";

export type StoredJiraVersionRow = {
  id: string;
  jiraId: string;
  name: string;
  description: string | null;
  releaseStatus: JiraReleaseStatus;
  releaseDate: Date | null;
  startDate: Date | null;
};

export class JiraReleaseStoreService {
  constructor(private readonly db: PrismaClient) {}

  async getCredentials(userId: string): Promise<{
    email: string | null;
    apiToken: string | null;
  } | null> {
    const credentialModel = this.db.jiraCredential;
    if (!credentialModel?.findUnique) {
      return null;
    }
    const row = await credentialModel
      .findUnique({
        where: { userId },
        select: { email: true, apiToken: true },
      })
      .catch(() => null);
    if (!row) return null;
    return {
      email: typeof row.email === "string" ? row.email : null,
      apiToken:
        typeof row.apiToken === "string" && row.apiToken.length > 0
          ? row.apiToken
          : null,
    };
  }

  async saveCredentials(input: {
    userId: string;
    email: string;
    apiToken?: string | null;
  }): Promise<{ email: string; hasToken: boolean }> {
    const credentialModel = this.db.jiraCredential;
    if (!credentialModel?.upsert) {
      throw new RestError(
        412,
        "PRECONDITION_FAILED",
        "JiraCredential model not available",
      );
    }
    const updateData: Record<string, unknown> = { email: input.email };
    if (typeof input.apiToken === "string" && input.apiToken.length > 0) {
      updateData.apiToken = input.apiToken;
    }
    await credentialModel.upsert({
      where: { userId: input.userId },
      update: updateData,
      create: {
        userId: input.userId,
        email: input.email,
        apiToken: input.apiToken ?? "",
      },
    });
    return {
      email: input.email,
      hasToken: Boolean(updateData.apiToken ?? input.apiToken),
    };
  }

  async listStoredVersions(options: {
    includeReleased: boolean;
    includeUnreleased: boolean;
    includeArchived: boolean;
    page: number;
    pageSize: number;
  }): Promise<{ total: number; items: StoredJiraVersionRow[] }> {
    const jiraVersionModel = this.db.jiraVersion;
    if (!jiraVersionModel?.findMany) {
      return { total: 0, items: [] };
    }

    const statusFilters: (
      | { releaseStatus: "Released" }
      | { releaseStatus: "Archived" }
      | { releaseStatus: "Unreleased" }
    )[] = [];
    if (options.includeReleased)
      statusFilters.push({ releaseStatus: "Released" });
    if (options.includeArchived)
      statusFilters.push({ releaseStatus: "Archived" });
    if (options.includeUnreleased)
      statusFilters.push({ releaseStatus: "Unreleased" });

    const where = statusFilters.length ? { OR: statusFilters } : {};

    const [total, rows] = await Promise.all([
      jiraVersionModel.count({ where }),
      jiraVersionModel.findMany({
        where,
        orderBy: [{ releaseStatus: "asc" }, { name: "asc" }],
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
        select: {
          id: true,
          jiraId: true,
          name: true,
          description: true,
          releaseStatus: true,
          releaseDate: true,
          startDate: true,
        },
      }),
    ]);

    return { total, items: rows as StoredJiraVersionRow[] };
  }

  async upsertVersions(versions: JiraVersion[]): Promise<number> {
    const versionModel = this.db.jiraVersion;
    if (!versionModel?.upsert) {
      throw new RestError(
        412,
        "PRECONDITION_FAILED",
        "JiraVersion model not available",
      );
    }

    const ops = versions.map((version) =>
      versionModel.upsert({
        where: { jiraId: version.id },
        update: {
          name: version.name,
          description: version.description ?? null,
          releaseStatus: version.releaseStatus,
          releaseDate: version.releaseDate
            ? new Date(version.releaseDate)
            : null,
          startDate: version.startDate ? new Date(version.startDate) : null,
        },
        create: {
          jiraId: version.id,
          name: version.name,
          description: version.description ?? null,
          releaseStatus: version.releaseStatus,
          releaseDate: version.releaseDate
            ? new Date(version.releaseDate)
            : null,
          startDate: version.startDate ? new Date(version.startDate) : null,
        },
      }),
    );

    const results = await this.db.$transaction(ops);
    return results.length;
  }
}
