import { releaseVersionRouter } from "~/server/api/routers/release-version";
import { builtVersionRouter } from "~/server/api/routers/built-version";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { componentVersionRouter } from "~/server/api/routers/component-version";
import { jiraRouter } from "~/server/api/routers/jira";
import { actionHistoryRouter } from "~/server/api/routers/action-history";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  releaseVersion: releaseVersionRouter,
  builtVersion: builtVersionRouter,
  componentVersion: componentVersionRouter,
  jira: jiraRouter,
  actionHistory: actionHistoryRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
