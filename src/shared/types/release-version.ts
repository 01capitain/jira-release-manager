import type { ISO8601 } from "~/shared/types/iso8601";

export type ReleaseVersionDto = {
  id: string;
  name: string;
  createdAt: ISO8601;
};
