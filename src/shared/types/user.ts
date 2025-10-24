import type { UuidV7 } from "~/shared/types/uuid";

export type UserSummaryDto = {
  id: UuidV7;
  name: string | null;
  email: string | null;
};
