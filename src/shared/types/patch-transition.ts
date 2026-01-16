import type { ISO8601 } from "~/shared/types/iso8601";
import type { PatchAction, PatchStatus } from "~/shared/types/patch-status";
import type { UuidV7 } from "~/shared/types/uuid";
import type { PatchDto } from "~/shared/types/patch";

export type PatchTransitionActionDto = PatchAction;

export type PatchTransitionDto = {
  id: UuidV7;
  patchId: UuidV7;
  fromStatus: PatchStatus;
  toStatus: PatchStatus;
  action: PatchTransitionActionDto;
  createdAt: ISO8601;
  createdById: UuidV7;
};

export type PatchTransitionActionContext =
  | {
      action: "startDeployment";
      nextPatchName: string;
      missingComponentSelections: number;
      hasSuccessor: boolean;
    }
  | { action: "cancelDeployment" }
  | {
      action: "markActive";
      readyForProd: boolean;
      pendingApprovals: string[];
    }
  | {
      action: "revertToDeployment";
      activeSince: ISO8601;
    }
  | {
      action: "deprecate";
      consumersImpacted: boolean;
    }
  | {
      action: "reactivate";
      deprecatedSince: ISO8601;
    };

export type PatchTransitionPreflightDto = {
  action: PatchAction;
  fromStatus: PatchStatus;
  toStatus: PatchStatus;
  allowed: boolean;
  blockers: string[];
  warnings: string[];
  expectedSideEffects: string[];
  patch: Pick<PatchDto, "id" | "name" | "currentStatus" | "versionId">;
  historyPreview: PatchTransitionDto[];
  actionContext?: PatchTransitionActionContext;
};
