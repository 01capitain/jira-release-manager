import { RestError } from "./errors";
import type { RestContext } from "./context";

export const ensureAuthenticated = (context: RestContext): string => {
  const userId = context.session?.user?.id;
  if (!userId) {
    throw new RestError(401, "UNAUTHORIZED", "Authentication required");
  }
  return userId;
};
