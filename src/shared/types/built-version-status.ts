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
}
