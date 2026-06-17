import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { runAgent } from "@/server/agent";

export const agentRouter = createTRPCRouter({
  chat: protectedProcedure
    .input(z.object({
      messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await runAgent(
        ctx.tenantId,
        input.messages,
      );
      return result;
    }),
});
