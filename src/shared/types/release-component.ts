import type { ISO8601 } from "~/shared/types/iso8601";
import type { UuidV7 } from "~/shared/types/uuid";

export const ReleaseComponentScopes = ["version-bound", "global"] as const;
export type ReleaseComponentScope = (typeof ReleaseComponentScopes)[number];

export type ReleaseComponentDto = {
  id: UuidV7;
  name: string;
  color: string; // Tailwind base color key, e.g., "blue"
  namingPattern: string;
  releaseScope: ReleaseComponentScope;
  createdAt: ISO8601;
};
