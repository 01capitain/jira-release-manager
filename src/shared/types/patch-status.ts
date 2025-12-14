import { z } from "zod";

export const PatchStatusSchema = z.enum([
  "in_development",
  "in_deployment",
  "active",
  "deprecated",
] as const);

export type PatchStatus =
  | "in_development"
  | "in_deployment"
  | "active"
  | "deprecated";

export type PatchAction =
  | "startDeployment"
  | "setActive"
  | "archive"
  | "reactivate"
  | "cancelDeployment"
  | "revertToDeployment"
  | "markActive"
  | "deprecate";

export const PatchActionSchema = z.enum([
  "startDeployment",
  "setActive",
  "archive",
  "reactivate",
  "cancelDeployment",
  "revertToDeployment",
  "markActive",
  "deprecate",
] as const);

export const StatusBadgeColor: Record<
  PatchStatus,
  { light: string; dark: string; text: string }
> = {
  in_development: {
    light: "bg-purple-100",
    dark: "dark:bg-purple-900/40",
    text: "text-purple-900 dark:text-purple-100",
  },
  in_deployment: {
    light: "bg-yellow-100",
    dark: "dark:bg-yellow-900/40",
    text: "text-yellow-900 dark:text-yellow-100",
  },
  active: {
    light: "bg-green-100",
    dark: "dark:bg-green-900/40",
    text: "text-green-900 dark:text-green-100",
  },
  deprecated: {
    light: "bg-gray-100",
    dark: "dark:bg-gray-900/40",
    text: "text-gray-900 dark:text-gray-100",
  },
};

// Static tint classes for header/body backgrounds to ensure Tailwind generates them
export const StatusTint: Record<
  PatchStatus,
  {
    headerLight: string;
    headerDark: string;
    bodyLight: string;
    bodyDark: string;
  }
> = {
  in_development: {
    headerLight: "bg-purple-200",
    headerDark: "dark:bg-purple-900/60",
    bodyLight: "bg-purple-50",
    bodyDark: "dark:bg-purple-950/30",
  },
  in_deployment: {
    headerLight: "bg-yellow-200",
    headerDark: "dark:bg-yellow-900/60",
    bodyLight: "bg-yellow-50",
    bodyDark: "dark:bg-yellow-950/30",
  },
  active: {
    headerLight: "bg-green-200",
    headerDark: "dark:bg-green-900/60",
    bodyLight: "bg-green-50",
    bodyDark: "dark:bg-green-950/30",
  },
  deprecated: {
    headerLight: "bg-gray-200",
    headerDark: "dark:bg-gray-900/60",
    bodyLight: "bg-gray-50",
    bodyDark: "dark:bg-gray-950/30",
  },
};

export function nextActionsForStatus(status: PatchStatus): PatchAction[] {
  switch (status) {
    case "in_development":
      return ["startDeployment"];
    case "in_deployment":
      return ["cancelDeployment", "markActive"];
    case "active":
      return ["revertToDeployment", "deprecate"];
    case "deprecated":
      return ["reactivate"];
  }
  // Exhaustiveness guard
  const _exhaustive: never = status;
  return _exhaustive;
}

export function labelForAction(a: PatchAction): string {
  switch (a) {
    case "startDeployment":
      return "Start Deployment";
    case "setActive":
      return "Set Active";
    case "archive":
      return "Archive";
    case "cancelDeployment":
      return "Cancel Deployment";
    case "revertToDeployment":
      return "Reopen Deployment";
    case "reactivate":
      return "Reactivate";
    case "markActive":
      return "Mark Active";
    case "deprecate":
      return "Deprecate";
  }
  const _exhaustive: never = a;
  return _exhaustive;
}

export function labelForStatus(s: PatchStatus): string {
  switch (s) {
    case "in_development":
      return "In Development";
    case "in_deployment":
      return "In Deployment";
    case "active":
      return "Active";
    case "deprecated":
      return "Deprecated";
  }
  const _exhaustive: never = s;
  return _exhaustive;
}

export function targetStatusForAction(a: PatchAction): PatchStatus {
  switch (a) {
    case "startDeployment":
      return "in_deployment";
    case "setActive":
      return "active";
    case "archive":
      return "deprecated";
    case "cancelDeployment":
      return "in_development";
    case "revertToDeployment":
      return "in_deployment";
    case "reactivate":
      return "active";
    case "markActive":
      return "active";
    case "deprecate":
      return "deprecated";
  }
  const _exhaustive: never = a;
  return _exhaustive;
}
