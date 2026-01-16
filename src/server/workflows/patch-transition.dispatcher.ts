import type { ActionLogger } from "~/server/services/action-history.service";
import type { PatchAction } from "~/shared/types/patch-status";
import type { ActionWorkflowService, PatchTransitionWork } from "./types";

export class ActionWorkflowDispatcher {
  constructor(
    private readonly services: Record<PatchAction, ActionWorkflowService>,
  ) {}

  async dispatch(item: PatchTransitionWork, logger: ActionLogger) {
    const service = this.services[item.action];
    if (!service) {
      throw new Error(`No workflow service for action ${item.action}`);
    }

    await service.execute({
      patchId: item.patchId,
      userId: item.userId,
      transitionId: item.transitionId,
      payload: item.payload,
      logger,
    });
  }
}
