export type BuiltVersionStatus =
  | "in_development"
  | "in_deployment"
  | "active"
  | "deprecated";

export type BuiltVersionAction =
  | "startDeployment"
  | "cancelDeployment"
  | "markActive"
  | "revertToDeployment"
  | "deprecate"
  | "reactivate";

export const StatusBadgeColor: Record<BuiltVersionStatus, { light: string; dark: string; text: string }> = {
  in_development: { light: "bg-purple-100", dark: "dark:bg-purple-900/40", text: "text-purple-900 dark:text-purple-100" },
  in_deployment: { light: "bg-yellow-100", dark: "dark:bg-yellow-900/40", text: "text-yellow-900 dark:text-yellow-100" },
  active: { light: "bg-green-100", dark: "dark:bg-green-900/40", text: "text-green-900 dark:text-green-100" },
  deprecated: { light: "bg-gray-100", dark: "dark:bg-gray-900/40", text: "text-gray-900 dark:text-gray-100" },
};

// Static tint classes for header/body backgrounds to ensure Tailwind generates them
export const StatusTint: Record<
  BuiltVersionStatus,
  { headerLight: string; headerDark: string; bodyLight: string; bodyDark: string }
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

export function nextActionsForStatus(status: BuiltVersionStatus): BuiltVersionAction[] {
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

export function labelForAction(a: BuiltVersionAction): string {
  switch (a) {
    case "startDeployment":
      return "Start Deployment";
    case "cancelDeployment":
      return "Cancel Deployment";
    case "markActive":
      return "Mark Active";
    case "revertToDeployment":
      return "Reopen Deployment";
    case "deprecate":
      return "Deprecate";
    case "reactivate":
      return "Reactivate";
  }
  const _exhaustive: never = a;
  return _exhaustive;
}

export function labelForStatus(s: BuiltVersionStatus): string {
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
}

export function targetStatusForAction(a: BuiltVersionAction): BuiltVersionStatus {
  switch (a) {
    case "startDeployment":
      return "in_deployment";
    case "cancelDeployment":
      return "in_development";
    case "markActive":
      return "active";
    case "revertToDeployment":
      return "in_deployment";
    case "deprecate":
      return "deprecated";
    case "reactivate":
      return "active";
  }
  const _exhaustive: never = a;
  return _exhaustive;
}
