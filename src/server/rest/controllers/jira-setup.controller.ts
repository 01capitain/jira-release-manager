import { z } from "zod";

import type { RestContext } from "~/server/rest/context";
import { ensureAuthenticated } from "~/server/rest/auth";
import { RestError } from "~/server/rest/errors";
import { jsonErrorResponse } from "~/server/rest/openapi";
import { env } from "~/env";
import {
  JiraCredentialsSchema,
  JiraVerifyConnectionSchema,
} from "~/server/api/schemas";

const JiraSetupCredentialsResponseSchema = z.object({
  email: z.string().nullable(),
  hasToken: z.boolean(),
});

export const getJiraConfig = async () => {
  return {
    baseUrl: env.JIRA_BASE_URL ?? null,
    projectKey: env.JIRA_PROJECT_KEY ?? null,
    envVarNames: ["JIRA_BASE_URL", "JIRA_PROJECT_KEY"] as const,
  } as const;
};

export const getJiraCredentials = async (context: RestContext) => {
  const userId = ensureAuthenticated(context);
  const credentialModel = context.db.jiraCredential;
  if (!credentialModel?.findUnique) {
    return JiraSetupCredentialsResponseSchema.parse({
      email: null,
      hasToken: false,
    });
  }
  const row = await credentialModel
    .findUnique({
      where: { userId },
      select: { email: true, apiToken: true },
    })
    .catch(() => null);
  if (!row) {
    return JiraSetupCredentialsResponseSchema.parse({
      email: null,
      hasToken: false,
    });
  }
  const email = typeof row.email === "string" ? row.email : null;
  const hasToken = typeof row.apiToken === "string" && row.apiToken.length > 0;
  return JiraSetupCredentialsResponseSchema.parse({ email, hasToken });
};

export const saveJiraCredentials = async (
  context: RestContext,
  input: z.infer<typeof JiraCredentialsSchema>,
) => {
  const userId = ensureAuthenticated(context);
  const credentialModel = context.db.jiraCredential;
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
    where: { userId },
    update: updateData,
    create: {
      userId,
      email: input.email,
      apiToken: input.apiToken ?? "",
    },
  });
  return { saved: true } as const;
};

const basicAuthHeader = (email: string, token: string) => {
  const auth = Buffer.from(`${email}:${token}`).toString("base64");
  return `Basic ${auth}`;
};

export const verifyJiraConnection = async (
  context: RestContext,
  input: z.infer<typeof JiraVerifyConnectionSchema>,
) => {
  const userId = ensureAuthenticated(context);
  const baseUrl = env.JIRA_BASE_URL;
  if (!baseUrl) {
    return {
      ok: false as const,
      status: 412,
      statusText: "Missing configuration",
      bodyText: "JIRA_BASE_URL is not set in environment",
    };
  }

  let token = input.apiToken;
  if (!token) {
    const credentialModel = context.db.jiraCredential;
    if (credentialModel?.findUnique) {
      const row = await credentialModel
        .findUnique({
          where: { userId },
          select: { apiToken: true },
        })
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

  const url = `${baseUrl}/rest/api/3/myself`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: basicAuthHeader(input.email, token),
      },
      cache: "no-store",
    });
    const text = await res.text();
    if (res.ok) {
      try {
        const parsed = JSON.parse(text) as {
          displayName?: string;
          accountId?: string;
        };
        return {
          ok: true as const,
          status: res.status,
          displayName: parsed.displayName,
          accountId: parsed.accountId,
        };
      } catch {
        return {
          ok: true as const,
          status: res.status,
          displayName: undefined,
          accountId: undefined,
        };
      }
    }
    return {
      ok: false as const,
      status: res.status,
      statusText: res.statusText,
      bodyText: text,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    return {
      ok: false as const,
      status: 0,
      statusText: "Network error",
      bodyText: message,
    };
  }
};

export const getJiraSetupStatus = async (context: RestContext) => {
  const baseUrl = env.JIRA_BASE_URL;
  const projectKey = env.JIRA_PROJECT_KEY;
  const credentialModel = context.db.jiraCredential;
  const userId = ensureAuthenticated(context);
  let email: string | undefined;
  let token: string | undefined;
  if (credentialModel?.findUnique) {
    const row = await credentialModel
      .findUnique({
        where: { userId },
        select: { email: true, apiToken: true },
      })
      .catch(() => null);
    if (row) {
      email =
        typeof row.email === "string" && row.email.length > 0
          ? row.email
          : undefined;
      token =
        typeof row.apiToken === "string" && row.apiToken.length > 0
          ? row.apiToken
          : undefined;
    }
  }

  if (!baseUrl) return { ok: false as const, reason: "Missing JIRA_BASE_URL" };
  if (!projectKey)
    return { ok: false as const, reason: "Missing JIRA_PROJECT_KEY" };
  if (!email) return { ok: false as const, reason: "Missing user email" };
  if (!token) return { ok: false as const, reason: "Missing user API token" };
  return { ok: true as const };
};

export const jiraSetupPaths = {
  "/jira/setup/config": {
    get: {
      operationId: "getJiraSetupConfig",
      summary: "Get Jira setup configuration",
      tags: ["Jira"] as const,
      responses: {
        200: {
          description: "Jira setup configuration",
        },
      },
    },
  },
  "/jira/setup/credentials": {
    get: {
      operationId: "getJiraCredentials",
      summary: "Get Jira credentials",
      tags: ["Jira"],
      responses: {
        200: {
          description: "Jira credentials",
          content: {
            "application/json": {
              schema: JiraSetupCredentialsResponseSchema,
            },
          },
        },
        401: jsonErrorResponse("Authentication required"),
      },
    },
    post: {
      operationId: "saveJiraCredentials",
      summary: "Save Jira credentials",
      tags: ["Jira"],
      requestBody: {
        content: {
          "application/json": {
            schema: JiraCredentialsSchema,
          },
        },
        required: true,
      },
      responses: {
        200: {
          description: "Credentials saved",
        },
        400: jsonErrorResponse("Validation error"),
        401: jsonErrorResponse("Authentication required"),
        412: jsonErrorResponse("Prerequisite missing"),
      },
    },
  },
  "/jira/setup/verify": {
    post: {
      operationId: "verifyJiraConnection",
      summary: "Verify Jira connection",
      tags: ["Jira"],
      requestBody: {
        content: {
          "application/json": {
            schema: JiraVerifyConnectionSchema,
          },
        },
        required: true,
      },
      responses: {
        200: {
          description: "Verification result",
        },
        401: jsonErrorResponse("Authentication required"),
      },
    },
  },
  "/jira/setup/status": {
    get: {
      operationId: "getJiraSetupStatus",
      summary: "Get Jira setup readiness",
      tags: ["Jira"],
      responses: {
        200: {
          description: "Setup readiness",
        },
        401: jsonErrorResponse("Authentication required"),
      },
    },
  },
} as const;
