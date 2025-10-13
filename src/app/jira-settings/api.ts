"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { getJson, postJson, type RestApiError } from "~/lib/rest-client";
import { JiraCredentialsSchema } from "~/server/api/schemas";

export type JiraConfigResponse = Awaited<ReturnType<typeof fetchJiraConfig>>;

export const jiraConfigQueryKey = ["jira", "setup", "config"] as const;
export const jiraCredentialsQueryKey = [
  "jira",
  "setup",
  "credentials",
] as const;
export const jiraStatusQueryKey = ["jira", "setup", "status"] as const;

export const fetchJiraConfig = async () => {
  return getJson<{
    baseUrl: string | null;
    projectKey: string | null;
    envVarNames: readonly string[];
  }>("/api/v1/jira/setup/config");
};

export const fetchJiraCredentials = async () => {
  return getJson<{ email: string | null; hasToken: boolean }>(
    "/api/v1/jira/setup/credentials",
  );
};

export const saveJiraCredentials = async (input: {
  email: string;
  apiToken?: string;
}) => {
  const payload = JiraCredentialsSchema.parse(input);
  return postJson<typeof payload, { saved: true }>(
    "/api/v1/jira/setup/credentials",
    payload,
  );
};

export const verifyJiraConnection = async (input: {
  email: string;
  apiToken?: string;
}) => {
  return postJson<
    typeof input,
    {
      ok: boolean;
      status: number;
      statusText?: string;
      bodyText?: string;
      displayName?: string;
      accountId?: string;
    }
  >("/api/v1/jira/setup/verify", input);
};

export const fetchJiraSetupStatus = async () => {
  return getJson<{ ok: boolean; reason?: string }>("/api/v1/jira/setup/status");
};

export const useJiraConfigQuery = () => {
  return useQuery({
    queryKey: jiraConfigQueryKey,
    queryFn: fetchJiraConfig,
    staleTime: Infinity,
  });
};

export const useJiraCredentialsQuery = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: jiraCredentialsQueryKey,
    queryFn: fetchJiraCredentials,
    enabled: options?.enabled ?? true,
  });
};

export const useSaveJiraCredentialsMutation = () => {
  return useMutation<
    { saved: true },
    RestApiError,
    { email: string; apiToken?: string }
  >({
    mutationFn: saveJiraCredentials,
  });
};

export const useVerifyJiraConnectionMutation = () => {
  return useMutation({
    mutationFn: verifyJiraConnection,
  });
};

export const useJiraSetupStatusQuery = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: jiraStatusQueryKey,
    queryFn: fetchJiraSetupStatus,
    enabled: options?.enabled ?? true,
  });
};
