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
});
