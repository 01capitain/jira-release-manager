import type { ISO8601 } from "~/shared/types/iso8601";

export type ReleaseComponentDto = {
  id: string;
  name: string;
  color: string; // Tailwind base color key, e.g., "blue"
  namingPattern: string;
  createdAt: ISO8601;
};
