import type { PatchAction, PatchStatus } from "~/shared/types/patch-status";

type TransitionRule = {
  fromStatus: PatchStatus;
  toStatus: PatchStatus;
};

const Rules: Record<PatchAction, TransitionRule> = {
  startDeployment: { fromStatus: "in_development", toStatus: "in_deployment" },
  cancelDeployment: { fromStatus: "in_deployment", toStatus: "in_development" },
  markActive: { fromStatus: "in_deployment", toStatus: "active" },
  setActive: { fromStatus: "in_deployment", toStatus: "active" },
  revertToDeployment: { fromStatus: "active", toStatus: "in_deployment" },
  deprecate: { fromStatus: "active", toStatus: "deprecated" },
  archive: { fromStatus: "active", toStatus: "deprecated" },
  reactivate: { fromStatus: "deprecated", toStatus: "active" },
};

type PatchWithStatus = {
  id: string;
  currentStatus?: PatchStatus | null;
};

export class ValidatePatchTransitionService {
  getRule(action: PatchAction): TransitionRule {
    const rule = Rules[action];
    if (!rule) {
      throw Object.assign(
        new Error(`Unsupported patch transition: ${action}`),
        {
          code: "UNSUPPORTED_TRANSITION" as const,
          details: { action },
        },
      );
    }
    return rule;
  }

  validate(patch: PatchWithStatus, action: PatchAction): TransitionRule {
    const rule = this.getRule(action);
    const currentStatus = patch.currentStatus ?? "in_development";
    if (currentStatus !== rule.fromStatus) {
      throw Object.assign(
        new Error(
          `Invalid transition from ${currentStatus} via ${action}. Expected ${rule.fromStatus}.`,
        ),
        {
          code: "INVALID_TRANSITION" as const,
          details: {
            from: currentStatus,
            expected: rule.fromStatus,
            action,
            patchId: patch.id,
          },
        },
      );
    }
    return rule;
  }
}
