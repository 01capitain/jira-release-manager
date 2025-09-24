import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { JiraVersionService } from "~/server/services/jira-version.service";
import { env } from "~/env";

export const jiraRouter = createTRPCRouter({
  getConfig: publicProcedure.query(() => ({
    baseUrl: env.JIRA_BASE_URL ?? null,
    projectKey: env.JIRA_PROJECT_KEY ?? null,
    envVarNames: ["JIRA_BASE_URL", "JIRA_PROJECT_KEY"] as const,
  } as const)),

  getCredentials: protectedProcedure.query(async ({ ctx }) => {
    const anyDb = ctx.db as unknown as { jiraCredential?: { findUnique?: Function } };
    const model = anyDb?.jiraCredential;
    if (!model?.findUnique) return { email: null, hasToken: false } as const;
    const row =
      (await model
        .findUnique({
          where: { userId: ctx.session.user.id },
          select: { email: true, apiToken: true },
        })
        .catch(() => null)) ?? null;
    return row
      ? ({ email: row.email as string, hasToken: Boolean((row as any).apiToken) } as const)
      : ({ email: null, hasToken: false } as const);
  }),

  saveCredentials: protectedProcedure
    .input(
      z.object({
        email: z.string().trim().email(),
        apiToken: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const anyDb = ctx.db as unknown as { jiraCredential?: { upsert?: Function } };
      const model = anyDb?.jiraCredential;
      if (!model?.upsert) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "JiraCredential model not available. Please run database migration and prisma generate.",
        });
      }
      const userId = ctx.session.user.id;
      const updateData: Record<string, unknown> = { email: input.email };
      if (typeof input.apiToken === "string" && input.apiToken.length > 0) {
        updateData.apiToken = input.apiToken;
      }
      await model.upsert({
        where: { userId },
        // if the record exists and token not supplied, keep existing token
        update: updateData,
        // on create, if token not provided yet, create with empty string (treated as not set)
        create: {
          userId,
          email: input.email,
          apiToken: input.apiToken ?? "",
        },
      });
      return { saved: true } as const;
    }),

  fetchVersions: protectedProcedure
    .input(
      z
        .object({
          pageSize: z.number().int().min(1).max(100).optional(),
          includeReleased: z.boolean().optional(),
          includeUnreleased: z.boolean().optional(),
          includeArchived: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const svc = new JiraVersionService();
      // Read user-scoped credentials if model exists
      const anyDb = ctx.db as unknown as { jiraCredential?: { findUnique?: Function } };
      const model = anyDb?.jiraCredential;
      const cred = model?.findUnique
        ? await model
            .findUnique({
              where: { userId: ctx.session.user.id },
              select: { email: true, apiToken: true },
            })
            .catch(() => null)
        : null;

      const res = await svc.fetchProjectVersions({
        pageSize: input?.pageSize,
        includeReleased: input?.includeReleased,
        includeUnreleased: input?.includeUnreleased,
        includeArchived: input?.includeArchived,
        baseUrl: env.JIRA_BASE_URL ?? undefined,
        projectKey: env.JIRA_PROJECT_KEY ?? undefined,
        email: cred?.email ?? undefined,
        apiToken: (cred as any)?.apiToken ?? undefined,
      });
      return res;
    }),

  verifyConnection: protectedProcedure
    .input(
      z.object({
        email: z.string().trim().email(),
        apiToken: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const baseUrl = env.JIRA_BASE_URL;
      if (!baseUrl) {
        return {
          ok: false as const,
          status: 412,
          statusText: "Missing configuration",
          bodyText: "JIRA_BASE_URL is not set in environment",
        };
      }
      // Resolve token: prefer provided, else stored for user
      let token = input.apiToken;
      if (!token) {
        const anyDb = ctx.db as unknown as { jiraCredential?: { findUnique?: Function } };
        const model = anyDb?.jiraCredential;
        if (model?.findUnique) {
          const row = await model
            .findUnique({ where: { userId: ctx.session.user.id }, select: { apiToken: true } })
            .catch(() => null);
          token = (row as any)?.apiToken as string | undefined;
        }
      }
      if (!token) {
        return {
          ok: false as const,
          status: 412,
          statusText: "Missing token",
          bodyText: "No API token provided or stored for this user",
        };
      }
      const auth = Buffer.from(`${input.email}:${token}`).toString("base64");
      const url = `${baseUrl}/rest/api/3/myself`;
      const reproCurl = [
        "curl --request GET \\",
        `  --url "${url}" \\\n+`,
        "  --user \"<YOUR_EMAIL>:<YOUR_API_TOKEN>\" \\",
        "  --header 'Accept: application/json'",
      ].join("\n");
      console.info("[jira.verifyConnection] Repro command:\n" + reproCurl);
      try {
        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
            Authorization: `Basic ${auth}`,
          },
          cache: "no-store",
        });
        const text = await res.text();
        if (res.ok) {
          // try to parse minimal fields
          let displayName: string | undefined;
          let accountId: string | undefined;
          try {
            const data = JSON.parse(text) as { displayName?: string; accountId?: string };
            displayName = data.displayName;
            accountId = data.accountId;
          } catch {
            // ignore parse errors; treat as ok
          }
          return { ok: true as const, status: res.status, displayName, accountId };
        }
        return {
          ok: false as const,
          status: res.status,
          statusText: res.statusText,
          bodyText: text,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Network error";
        return { ok: false as const, status: 0, statusText: "Network error", bodyText: msg };
      }
    }),

  canSync: protectedProcedure.mutation(async ({ ctx }) => {
    const baseUrl = env.JIRA_BASE_URL;
    const projectKey = env.JIRA_PROJECT_KEY;
    const anyDb = ctx.db as unknown as { jiraCredential?: { findUnique?: Function } };
    const model = anyDb?.jiraCredential;
    let token: string | undefined;
    let email: string | undefined;
    if (model?.findUnique) {
      const row = (await model
        .findUnique({ where: { userId: ctx.session.user.id }, select: { email: true, apiToken: true } })
        .catch(() => null)) as { email?: string; apiToken?: string } | null;
      token = row?.apiToken;
      email = row?.email;
    }
    // Check presence first
    if (!baseUrl || !projectKey || !email || !token) {
      return { ok: false as const, reason: "Missing configuration or credentials" };
    }
    // Validate credentials via /myself
    const auth = Buffer.from(`${email}:${token}`).toString("base64");
    try {
      const meRes = await fetch(`${baseUrl}/rest/api/3/myself`, {
        headers: { Accept: "application/json", Authorization: `Basic ${auth}` },
        cache: "no-store",
      });
      if (!meRes.ok) return { ok: false as const, reason: `Auth failed: ${meRes.status}` };
      // Validate project access (1 item page)
      const projRes = await fetch(
        `${String(baseUrl).replace(/\/+$/, "")}/rest/api/3/project/${encodeURIComponent(
          String(projectKey)
        )}/version?startAt=0&maxResults=1`,
        { headers: { Accept: "application/json", Authorization: `Basic ${auth}` }, cache: "no-store" },
      );
      if (!projRes.ok) return { ok: false as const, reason: `Project access failed: ${projRes.status}` };
      return { ok: true as const };
    } catch {
      return { ok: false as const, reason: "Network error" };
    }
  }),

  // Quick readiness check: verifies only presence of env + user credentials
  canSyncQuick: protectedProcedure.query(async ({ ctx }) => {
    const baseUrl = env.JIRA_BASE_URL;
    const projectKey = env.JIRA_PROJECT_KEY;
    const anyDb = ctx.db as unknown as { jiraCredential?: { findUnique?: Function } };
    const model = anyDb?.jiraCredential;
    let email: string | undefined;
    let token: string | undefined;
    if (model?.findUnique) {
      const row = (await model
        .findUnique({ where: { userId: ctx.session.user.id }, select: { email: true, apiToken: true } })
        .catch(() => null)) as { email?: string; apiToken?: string } | null;
      email = row?.email ?? undefined;
      token = row?.apiToken ?? undefined;
    }
    if (!baseUrl) return { ok: false as const, reason: "Missing JIRA_BASE_URL" };
    if (!projectKey) return { ok: false as const, reason: "Missing JIRA_PROJECT_KEY" };
    if (!email) return { ok: false as const, reason: "Missing user email" };
    if (!token) return { ok: false as const, reason: "Missing user API token" };
    return { ok: true as const };
  }),

  listStoredVersions: publicProcedure
    .input(
      z
        .object({
          includeReleased: z.boolean().optional(),
          includeUnreleased: z.boolean().optional(),
          includeArchived: z.boolean().optional(),
          page: z.number().int().min(1).optional(),
          pageSize: z.number().int().min(1).max(100).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const includeReleased = input?.includeReleased ?? true;
      const includeUnreleased = input?.includeUnreleased ?? true;
      const includeArchived = input?.includeArchived ?? false;
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 50;
      const anyDb = ctx.db as unknown as { jiraVersion?: any };
      const model = anyDb?.jiraVersion;
      if (!model?.findMany) return { total: 0, items: [] as any[] };
      const where = {
        OR: [
          includeReleased ? { released: true } : undefined,
          includeArchived ? { archived: true } : undefined,
          includeUnreleased ? { AND: [{ released: false }, { archived: false }] } : undefined,
        ].filter(Boolean),
      };
      const [total, rows] = await Promise.all([
        model.count({ where }),
        model.findMany({
          where,
          orderBy: [{ released: "asc" }, { name: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            jiraId: true,
            name: true,
            released: true,
            archived: true,
            releaseDate: true,
            startDate: true,
          },
        }),
      ]);
      return { total, items: rows } as const;
    }),

  syncVersions: protectedProcedure
    .input(
      z
        .object({
          includeReleased: z.boolean().optional(),
          includeUnreleased: z.boolean().optional(),
          includeArchived: z.boolean().optional(),
          pageSize: z.number().int().min(1).max(100).optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const svc = new JiraVersionService();
      const anyDb = ctx.db as unknown as { jiraCredential?: any; jiraVersion?: any };
      const credModel = anyDb?.jiraCredential;
      const versModel = anyDb?.jiraVersion;
      if (!credModel?.findUnique || !versModel?.upsert) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Database models missing. Please run migration and prisma generate.",
        });
      }
      const cred = await credModel.findUnique({
        where: { userId: ctx.session.user.id },
        select: { email: true, apiToken: true },
      });
      const res = await svc.fetchProjectVersions({
        pageSize: input?.pageSize,
        includeReleased: input?.includeReleased,
        includeUnreleased: input?.includeUnreleased,
        includeArchived: input?.includeArchived,
        baseUrl: env.JIRA_BASE_URL ?? undefined,
        projectKey: env.JIRA_PROJECT_KEY ?? undefined,
        email: cred?.email ?? undefined,
        apiToken: cred?.apiToken ?? undefined,
      });
      if (!res.configured) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Jira not configured" });
      }
      // Upsert versions
      const tx = anyDb as any;
      let upserts = 0;
      for (const v of res.items) {
        await versModel.upsert({
          where: { jiraId: v.id },
          update: {
            name: v.name,
            description: v.description ?? null,
            released: v.released,
            archived: v.archived,
            releaseDate: v.releaseDate ? new Date(v.releaseDate) : null,
            startDate: v.startDate ? new Date(v.startDate) : null,
            projectKey: env.JIRA_PROJECT_KEY ?? null,
          },
          create: {
            jiraId: v.id,
            name: v.name,
            description: v.description ?? null,
            released: v.released,
            archived: v.archived,
            releaseDate: v.releaseDate ? new Date(v.releaseDate) : null,
            startDate: v.startDate ? new Date(v.startDate) : null,
            projectKey: env.JIRA_PROJECT_KEY ?? null,
          },
        });
        upserts += 1;
      }
      return { saved: upserts } as const;
    }),
});
