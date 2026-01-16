import type { ActionWorkflowInput, ActionWorkflowService } from "../types";

export class NoOpWorkflowService implements ActionWorkflowService {
  async execute({ logger }: ActionWorkflowInput) {
    // No-op workflow
    await logger.subaction({
      subactionType: "patch.workflow.noop",
      message: "No workflow actions required",
    });
  }
}
