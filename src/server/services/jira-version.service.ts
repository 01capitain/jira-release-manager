import type { JiraReleaseStatus } from "@prisma/client";

import { env } from "~/env";

export type JiraVersion = {
  id: string;
  name: string;
  description?: string | null;
  releaseStatus: JiraReleaseStatus;
  releaseDate?: string | null; // YYYY-MM-DD
  startDate?: string | null; // YYYY-MM-DD
};

export class JiraVersionService {
  private baseUrl?: string;
  private projectKey?: string;

  constructor() {
    this.baseUrl = env.JIRA_BASE_URL;
    this.projectKey = env.JIRA_PROJECT_KEY;
  }

  get isConfigured(): boolean {
    return Boolean(this.baseUrl && this.projectKey);
  }

  /**
   * Fetch all project versions using the paginated endpoint.
   */
  async fetchProjectVersions(options?: {
    pageSize?: number;
    includeReleased?: boolean;
    includeUnreleased?: boolean;
    includeArchived?: boolean;
    baseUrl?: string;
    projectKey?: string;
    email?: string;
    apiToken?: string;
  }): Promise<{ configured: boolean; items: JiraVersion[] }> {
    const baseUrl = options?.baseUrl ?? this.baseUrl;
    const projectKey = options?.projectKey ?? this.projectKey;
    const email = options?.email;
    const token = options?.apiToken;
    const configured = Boolean(baseUrl && projectKey && email && token);
    if (!configured) return { configured: false, items: [] };

    const pageSize = Math.min(Math.max(options?.pageSize ?? 50, 1), 100);
    const auth = Buffer.from(`${email}:${token}`).toString("base64");
    const headers = {
      Accept: "application/json",
      Authorization: `Basic ${auth}`,
    } as const;

    const items: JiraVersion[] = [];
    let startAt = 0;
    let isLast = false;

    while (!isLast) {
      const url = `${String(baseUrl).replace(/\/+$/, "")}/rest/api/3/project/${encodeURIComponent(
        String(projectKey),
      )}/version?startAt=${startAt}&maxResults=${pageSize}`;
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `Jira request failed (${res.status}): ${text || res.statusText}`,
        );
      }
      const raw = (await res.json()) as unknown;
      const page = (
        typeof raw === "object" && raw !== null ? raw : {}
      ) as Record<string, unknown>;
      const values = Array.isArray(page.values)
        ? (page.values as unknown[])
        : [];
      const mapped: JiraVersion[] = values.map((v) => {
        const obj = (typeof v === "object" && v !== null ? v : {}) as Record<
          string,
          unknown
        >;
        const rawId = obj.id;
        const id =
          typeof rawId === "string"
            ? rawId
            : typeof rawId === "number"
              ? rawId.toString()
              : "";
        const rawName = obj.name;
        const name = typeof rawName === "string" ? rawName : "";
        const rawDescription = obj.description;
        const description =
          typeof rawDescription === "string" && rawDescription.length > 0
            ? rawDescription
            : null;
        const released = Boolean((obj as { released?: unknown }).released);
        const archived = Boolean((obj as { archived?: unknown }).archived);
        const releaseDate =
          typeof obj.releaseDate === "string" && obj.releaseDate.length > 0
            ? obj.releaseDate
            : null;
        const startDate =
          typeof obj.startDate === "string" && obj.startDate.length > 0
            ? obj.startDate
            : null;
        const releaseStatus: JiraReleaseStatus = archived
          ? "Archived"
          : released
            ? "Released"
            : "Unreleased";
        return {
          id,
          name,
          description,
          releaseStatus,
          releaseDate,
          startDate,
        };
      });
      items.push(...mapped.filter((m) => m.id));
      isLast = Boolean((page as { isLast?: unknown }).isLast);
      const startValue = (page as { startAt?: unknown }).startAt;
      const start =
        typeof startValue === "number" && Number.isFinite(startValue)
          ? startValue
          : 0;
      const count = Array.isArray(page.values)
        ? (page.values as unknown[]).length
        : mapped.length;
      startAt = start + count;
      // Safety guard against unexpected loops
      if (!Number.isFinite(startAt) || startAt > 10_000) break;
    }

    const includeReleased = options?.includeReleased ?? true;
    const includeUnreleased = options?.includeUnreleased ?? true;
    const includeArchived = options?.includeArchived ?? false;

    const filtered = items.filter((v) => {
      if (v.releaseStatus === "Released") return includeReleased;
      if (v.releaseStatus === "Archived") return includeArchived;
      return includeUnreleased;
    });

    return { configured: true, items: filtered };
  }
}
