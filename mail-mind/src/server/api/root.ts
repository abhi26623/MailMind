import { emailRouter } from "@/server/api/routers/email";
import { connectRouter } from "@/server/api/routers/connect";
import { agentRouter } from "@/server/api/routers/agent";
import { insightsRouter } from "@/server/api/routers/insights";
import { workflowRouter } from "@/server/api/routers/workflow";
import { availabilityRouter } from "@/server/api/routers/availability";
import { schedulingRouter } from "@/server/api/routers/scheduling";
import { searchRouter } from "@/server/api/routers/search";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  email: emailRouter,
  connect: connectRouter,
  agent: agentRouter,
  insights: insightsRouter,
  workflow: workflowRouter,
  availability: availabilityRouter,
  scheduling: schedulingRouter,
  search: searchRouter,
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
