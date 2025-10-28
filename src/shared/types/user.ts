import type { UuidV7 } from "~/shared/types/uuid";

export type UserSummaryDto = Readonly<{
  id: UuidV7;
  name: string | null;
  email: string | null;
}>;
