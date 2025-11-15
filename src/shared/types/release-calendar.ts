import type { ISO8601 } from "~/shared/types/iso8601";
import type { UuidV7 } from "~/shared/types/uuid";

export type ReleaseCalendarEventComponent = {
  name: string;
  color?: string;
};

export type ReleaseCalendarEvent = {
  builtVersionId: UuidV7;
  builtVersionName: string;
  timestamp: ISO8601;
  statusLabel?: string;
  components: ReleaseCalendarEventComponent[];
};
