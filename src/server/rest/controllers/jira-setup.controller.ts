import { z } from "zod";

import type { RestContext } from "~/server/rest/context";
import { ensureAuthenticated } from "~/server/rest/auth";
import { jsonErrorResponse } from "~/server/rest/openapi";
import { env } from "~/env";
import {
  JiraCredentialsSchema,
  JiraVerifyConnectionSchema,
} from "~/server/api/schemas";
import { JiraReleaseStoreService } from "~/server/services/jira-release-store.service";

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
  const store = new JiraReleaseStoreService(context.db);
  const creds = await store.getCredentials(userId);
  const email = creds?.email ?? null;
  const hasToken = Boolean(creds?.apiToken);
  return JiraSetupCredentialsResponseSchema.parse({ email, hasToken });
};

export const saveJiraCredentials = async (
  context: RestContext,
  input: z.infer<typeof JiraCredentialsSchema>,
) => {
  const userId = ensureAuthenticated(context);
  const store = new JiraReleaseStoreService(context.db);
  await store.saveCredentials({
    userId,
    email: input.email,
    apiToken: input.apiToken ?? null,
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
    const store = new JiraReleaseStoreService(context.db);
    const creds = await store.getCredentials(userId);
    token = creds?.apiToken ?? undefined;
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
  const userId = ensureAuthenticated(context);
  let email: string | undefined;
  let token: string | undefined;
  const store = new JiraReleaseStoreService(context.db);
  const creds = await store.getCredentials(userId);
  if (creds) {
    email =
      typeof creds.email === "string" && creds.email.length > 0
        ? creds.email
        : undefined;
    token =
      typeof creds.apiToken === "string" && creds.apiToken.length > 0
        ? creds.apiToken
        : undefined;
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
