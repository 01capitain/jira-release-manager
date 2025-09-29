import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  requireUserId,
} from "~/server/api/trpc";
import { JiraVersionService } from "~/server/services/jira-version.service";
import {
  JiraCredentialsSchema,
  JiraFetchVersionsInputSchema,
  JiraVerifyConnectionSchema,
} from "~/server/api/schemas";
import { env } from "~/env";

type DelegateKey = keyof PrismaClient;

const getDelegate = <K extends DelegateKey>(
  client: PrismaClient,
  key: K,
): PrismaClient[K] | null => {
  const partial = client as Partial<Pick<PrismaClient, K>>;
  const delegate = partial[key];
  return delegate ?? null;
};

export const jiraRouter = createTRPCRouter({
  getConfig: publicProcedure.query(() => ({
    baseUrl: env.JIRA_BASE_URL ?? null,
    projectKey: env.JIRA_PROJECT_KEY ?? null,
    envVarNames: ["JIRA_BASE_URL", "JIRA_PROJECT_KEY"] as const,
  } as const)),

  getCredentials: protectedProcedure.query(async ({ ctx }) => {
    const credentialModel = getDelegate(ctx.db, "jiraCredential");
    if (!credentialModel?.findUnique) {
      return { email: null, hasToken: false } as const;
    }
    const userId = requireUserId(ctx.session);
    const row =
      (await credentialModel
        .findUnique({
          where: { userId },
          select: { email: true, apiToken: true },
        })
        .catch(() => null)) ?? null;
    if (!row) {
      return { email: null, hasToken: false } as const;
    }
    const email = typeof row.email === "string" ? row.email : null;
    const hasToken = typeof row.apiToken === "string" && row.apiToken.length > 0;
    return { email, hasToken } as const;
  }),

  saveCredentials: protectedProcedure
    .input(JiraCredentialsSchema)
    .mutation(async ({ ctx, input }) => {
      const credentialModel = getDelegate(ctx.db, "jiraCredential");
      if (!credentialModel?.upsert) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "JiraCredential model not available. Please run database migration and prisma generate.",
        });
      }
      const userId = requireUserId(ctx.session);
      const updateData: Record<string, unknown> = { email: input.email };
      if (typeof input.apiToken === "string" && input.apiToken.length > 0) {
        updateData.apiToken = input.apiToken;
      }
      await credentialModel.upsert({
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
    .input(JiraFetchVersionsInputSchema)
    .query(async ({ ctx, input }) => {
      const svc = new JiraVersionService();
      // Read user-scoped credentials if model exists
      const credentialModel = getDelegate(ctx.db, "jiraCredential");
      const userId = requireUserId(ctx.session);
      const cred = credentialModel?.findUnique
        ? await credentialModel
            .findUnique({
              where: { userId },
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
        email: typeof cred?.email === "string" ? cred.email : undefined,
        apiToken:
          typeof cred?.apiToken === "string" && cred.apiToken.length > 0
            ? cred.apiToken
            : undefined,
      });
      return res;
    }),

  verifyConnection: protectedProcedure
    .input(JiraVerifyConnectionSchema)
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
        const credentialModel = getDelegate(ctx.db, "jiraCredential");
        if (credentialModel?.findUnique) {
          const userId = requireUserId(ctx.session);
          const row = await credentialModel
            .findUnique({ where: { userId }, select: { apiToken: true } })
            .catch(() => null);
          const storedToken =
            typeof row?.apiToken === "string" && row.apiToken.length > 0
              ? row.apiToken
              : undefined;
          token = storedToken;
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
        `  --url "${url}" \\`,
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
    const credentialModel = getDelegate(ctx.db, "jiraCredential");
    const userId = requireUserId(ctx.session);
    let token: string | undefined;
    let email: string | undefined;
    if (credentialModel?.findUnique) {
      const row = await credentialModel
        .findUnique({ where: { userId }, select: { email: true, apiToken: true } })
        .catch(() => null);
      if (row) {
        email = typeof row.email === "string" && row.email.length > 0 ? row.email : undefined;
        token =
          typeof row.apiToken === "string" && row.apiToken.length > 0
            ? row.apiToken
            : undefined;
      }
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
    const credentialModel = getDelegate(ctx.db, "jiraCredential");
    const userId = requireUserId(ctx.session);
    let email: string | undefined;
    let token: string | undefined;
    if (credentialModel?.findUnique) {
      const row = await credentialModel
        .findUnique({ where: { userId }, select: { email: true, apiToken: true } })
        .catch(() => null);
      if (row) {
        email = typeof row.email === "string" && row.email.length > 0 ? row.email : undefined;
        token =
          typeof row.apiToken === "string" && row.apiToken.length > 0
            ? row.apiToken
            : undefined;
      }
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
      const jiraVersionModel = getDelegate(ctx.db, "jiraVersion");
      if (!jiraVersionModel?.findMany) {
        return { total: 0, items: [] as const };
      }
      const where = {
        OR: [
          includeReleased ? { released: true } : undefined,
          includeArchived ? { archived: true } : undefined,
          includeUnreleased ? { AND: [{ released: false }, { archived: false }] } : undefined,
        ].filter(Boolean),
      };
      const [total, rows] = await Promise.all([
        jiraVersionModel.count({ where }),
        jiraVersionModel.findMany({
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
      const credentialModel = getDelegate(ctx.db, "jiraCredential");
      const versionModel = getDelegate(ctx.db, "jiraVersion");
      if (!credentialModel?.findUnique || !versionModel?.upsert) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Database models missing. Please run migration and prisma generate.",
        });
      }
      const userId = requireUserId(ctx.session);
      const cred = await credentialModel.findUnique({
        where: { userId },
        select: { email: true, apiToken: true },
      });
      const res = await svc.fetchProjectVersions({
        pageSize: input?.pageSize,
        includeReleased: input?.includeReleased,
        includeUnreleased: input?.includeUnreleased,
        includeArchived: input?.includeArchived,
        baseUrl: env.JIRA_BASE_URL ?? undefined,
        projectKey: env.JIRA_PROJECT_KEY ?? undefined,
        email: typeof cred?.email === "string" ? cred.email : undefined,
        apiToken:
          typeof cred?.apiToken === "string" && cred.apiToken.length > 0
            ? cred.apiToken
            : undefined,
      });
      if (!res.configured) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Jira not configured" });
      }
      // Upsert versions atomically
      const ops = res.items.map((version) =>
        versionModel.upsert({
          where: { jiraId: version.id },
          update: {
            name: version.name,
            description: version.description ?? null,
            released: version.released,
            archived: version.archived,
            releaseDate: version.releaseDate ? new Date(version.releaseDate) : null,
            startDate: version.startDate ? new Date(version.startDate) : null,
            projectKey: env.JIRA_PROJECT_KEY ?? null,
          },
          create: {
            jiraId: version.id,
            name: version.name,
            description: version.description ?? null,
            released: version.released,
            archived: version.archived,
            releaseDate: version.releaseDate ? new Date(version.releaseDate) : null,
            startDate: version.startDate ? new Date(version.startDate) : null,
            projectKey: env.JIRA_PROJECT_KEY ?? null,
          },
        })
      );
      const results = await ctx.db.$transaction(ops);
      return { saved: results.length } as const;
    }),
});
