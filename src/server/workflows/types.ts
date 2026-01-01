import type { ActionLogger } from "~/server/services/action-history.service";
import type { PatchAction } from "~/shared/types/patch-status";

export type ActionWorkflowInput = {
  patchId: string;
  userId: string;
  transitionId: string;
  payload?: unknown;
  logger: ActionLogger;
};

export interface ActionWorkflowService {
  execute(input: ActionWorkflowInput): Promise<void>;
}

export type PatchTransitionWork = {
  patchId: string;
  userId: string;
  transitionId: string;
  action: PatchAction;
  payload?: unknown;
};
