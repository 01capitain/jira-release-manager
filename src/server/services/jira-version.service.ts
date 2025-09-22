import { env } from "~/env";

export type JiraVersion = {
  id: string;
  name: string;
  description?: string | null;
  released: boolean;
  archived: boolean;
  releaseDate?: string | null; // YYYY-MM-DD
  startDate?: string | null; // YYYY-MM-DD
};

type JiraApiPage<T> = {
  self: string;
  maxResults: number;
  startAt: number;
  total: number;
  isLast: boolean;
  values: T[];
};

export class JiraVersionService {
  private baseUrl?: string;
  private email?: string;
  private token?: string;
  private projectKey?: string;

  constructor() {
    this.baseUrl = env.JIRA_BASE_URL;
    this.email = env.JIRA_EMAIL;
    this.token = env.JIRA_API_TOKEN;
    this.projectKey = env.JIRA_PROJECT_KEY;
  }

  get isConfigured(): boolean {
    return Boolean(this.baseUrl && this.email && this.token && this.projectKey);
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
    const email = options?.email ?? this.email;
    const token = options?.apiToken ?? this.token;
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
      const url = `${baseUrl}/rest/api/3/project/${projectKey}/version?startAt=${startAt}&maxResults=${pageSize}`;
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Jira request failed (${res.status}): ${text || res.statusText}`);
      }
      const raw = (await res.json()) as unknown;
      const page = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
      const values = Array.isArray(page.values) ? (page.values as unknown[]) : [];
      const mapped: JiraVersion[] = values.map((v) => {
        const obj = (typeof v === "object" && v !== null ? v : {}) as Record<string, unknown>;
        const id = obj.id != null ? String(obj.id) : "";
        const name = obj.name != null ? String(obj.name) : "";
        const description = obj.description != null ? String(obj.description as string) : null;
        const released = Boolean((obj as { released?: unknown }).released);
        const archived = Boolean((obj as { archived?: unknown }).archived);
        const releaseDate = obj.releaseDate != null ? String(obj.releaseDate as string) : null;
        const startDate = obj.startDate != null ? String(obj.startDate as string) : null;
        return { id, name, description, released, archived, releaseDate, startDate };
      });
      items.push(...mapped);
      isLast = Boolean((page as { isLast?: unknown }).isLast);
      const start = typeof (page as { startAt?: unknown }).startAt === "number" ? (page as { startAt?: number }).startAt : 0;
      const max = typeof (page as { maxResults?: unknown }).maxResults === "number" ? (page as { maxResults?: number }).maxResults : mapped.length;
      startAt = start + max;
      // Safety guard against unexpected loops
      if (!Number.isFinite(startAt) || startAt > 10_000) break;
    }

    const includeReleased = options?.includeReleased ?? true;
    const includeUnreleased = options?.includeUnreleased ?? true;
    const includeArchived = options?.includeArchived ?? false;

    const filtered = items.filter((v) => {
      const isReleased = v.released === true;
      const isArchived = v.archived === true;
      const isUnreleased = !isReleased && !isArchived;
      return (
        (includeReleased && isReleased) ||
        (includeUnreleased && isUnreleased) ||
        (includeArchived && isArchived)
      );
    });

    return { configured: true, items: filtered };
  }
}
