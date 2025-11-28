import type { ISO8601 } from "~/shared/types/iso8601";
import type { UuidV7 } from "~/shared/types/uuid";

export type ComponentVersionDto = {
  id: UuidV7;
  releaseComponentId: UuidV7;
  patchId: UuidV7;
  name: string;
  increment: number;
  createdAt: ISO8601;
};
