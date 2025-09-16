import type { ISO8601 } from "~/shared/types/iso8601";

export type BuiltVersionDto = {
  id: string;
  name: string;
  versionId: string;
  createdAt: ISO8601;
};
