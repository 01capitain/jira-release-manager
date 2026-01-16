import { z } from "zod";

import { env } from "~/env";
import { ensureAuthenticated } from "~/server/rest/auth";
import type { RestContext } from "~/server/rest/context";
import { RestError } from "~/server/rest/errors";
import { jsonErrorResponse } from "~/server/rest/openapi";
import { JiraReleaseStoreService } from "~/server/services/jira-release-store.service";
import { JiraVersionService } from "~/server/services/jira-version.service";

export const JiraStoredVersionsQuerySchema = z
  .object({
    includeReleased: z.coerce.boolean().optional(),
    includeUnreleased: z.coerce.boolean().optional(),
    includeArchived: z.coerce.boolean().optional(),
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
  })
  .partial();

export type JiraStoredVersionsQuery = z.infer<
  typeof JiraStoredVersionsQuerySchema
>;

const JiraReleaseStatusSchema = z.enum([
  "Released",
  "Unreleased",
  "Archived",
] as const);

export const JiraStoredVersionSchema = z.object({
  id: z.uuidv7(),
  jiraId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  releaseStatus: JiraReleaseStatusSchema,
  releaseDate: z.string().nullable(),
  startDate: z.string().nullable(),
});

export const JiraStoredVersionsResponseSchema = z.object({
  total: z.number().int(),
  items: z.array(JiraStoredVersionSchema),
});

export const listStoredJiraVersions = async (
  context: RestContext,
  query: JiraStoredVersionsQuery,
) => {
  // Require authentication to access stored Jira versions
  ensureAuthenticated(context);

  const includeReleased = query?.includeReleased ?? true;
  const includeUnreleased = query?.includeUnreleased ?? true;
  const includeArchived = query?.includeArchived ?? false;
  const page = query?.page ?? 1;
  const pageSize = query?.pageSize ?? 50;

  const store = new JiraReleaseStoreService(context.db);
  const result = await store.listStoredVersions({
    includeReleased,
    includeUnreleased,
    includeArchived,
    page,
    pageSize,
  });
  const items = result.items.map((row) =>
    JiraStoredVersionSchema.parse({
      ...row,
      releaseDate: row.releaseDate ? row.releaseDate.toISOString() : null,
      startDate: row.startDate ? row.startDate.toISOString() : null,
    }),
  );
  return JiraStoredVersionsResponseSchema.parse({ total: result.total, items });
};

export const JiraSyncVersionsInputSchema = z
  .object({
    includeReleased: z.boolean().optional(),
    includeUnreleased: z.boolean().optional(),
    includeArchived: z.boolean().optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
  })
  .partial();

export type JiraSyncVersionsInput = z.infer<typeof JiraSyncVersionsInputSchema>;

export const JiraSyncResultSchema = z.object({
  saved: z.number().int(),
});

export const syncJiraVersions = async (
  context: RestContext,
  input: JiraSyncVersionsInput,
) => {
  const userId = ensureAuthenticated(context);
  const svc = new JiraVersionService();
  const store = new JiraReleaseStoreService(context.db);
  const cred = await store.getCredentials(userId);

  let response;
  try {
    response = await svc.fetchProjectVersions({
      includeReleased: input?.includeReleased,
      includeUnreleased: input?.includeUnreleased,
      includeArchived: input?.includeArchived,
      pageSize: input?.pageSize,
      baseUrl: env.JIRA_BASE_URL ?? undefined,
      projectKey: env.JIRA_PROJECT_KEY ?? undefined,
      email: typeof cred?.email === "string" ? cred.email : undefined,
      apiToken: cred?.apiToken ?? undefined,
    });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to fetch Jira versions";
    throw new RestError(502, "UPSTREAM_ERROR", msg);
  }

  if (!response.configured) {
    throw new RestError(412, "PRECONDITION_FAILED", "Jira not configured");
  }

  const versions = response.items;
  const saved = await store.upsertVersions(versions);
  return JiraSyncResultSchema.parse({ saved });
};

export const jiraReleasesPaths = {
  "/jira/releases/stored": {
    get: {
      operationId: "listStoredJiraVersions",
      summary: "List stored Jira versions",
      tags: ["Jira"],
      requestParams: {
        query: JiraStoredVersionsQuerySchema,
      },
      responses: {
        200: {
          description: "Stored Jira versions",
          content: {
            "application/json": {
              schema: JiraStoredVersionsResponseSchema,
            },
          },
        },
        401: jsonErrorResponse("Authentication required"),
      },
    },
  },
  "/jira/releases/sync": {
    post: {
      operationId: "syncJiraVersions",
      summary: "Sync Jira versions",
      tags: ["Jira"],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: JiraSyncVersionsInputSchema,
          },
        },
      },
      responses: {
        200: {
          description: "Sync result",
          content: {
            "application/json": {
              schema: JiraSyncResultSchema,
            },
          },
        },
        401: jsonErrorResponse("Authentication required"),
        412: jsonErrorResponse("Jira configuration missing"),
      },
    },
  },
} as const;
