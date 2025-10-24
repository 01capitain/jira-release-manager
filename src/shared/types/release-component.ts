import type { ISO8601 } from "~/shared/types/iso8601";
import type { UuidV7 } from "~/shared/types/uuid";

export type ReleaseComponentDto = {
  id: UuidV7;
  name: string;
  color: string; // Tailwind base color key, e.g., "blue"
  namingPattern: string;
  createdAt: ISO8601;
};
