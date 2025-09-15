import type { ISO8601 } from "~/shared/types/iso8601";

export type ComponentVersionDto = {
  id: string;
  releaseComponentId: string;
  builtVersionId: string;
  name: string;
  increment: number;
  createdAt: ISO8601;
};
