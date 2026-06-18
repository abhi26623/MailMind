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
      return {
        ...result,
        requiresConfirmation: result.requiresConfirmation ?? false,
        pendingScript: result.pendingScript ?? null,
      };
    }),
  generateDraft: protectedProcedure
    .input(z.object({
      prompt: z.string(),
      context: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { openrouter, AGENT_MODELS } = await import("@/lib/ai");
      
      const systemPrompt = `You are an AI Email Assistant.
Draft a professional email reply or new email based on the user's prompt.
If context is provided (e.g. the original email), use it to inform the reply.
Only output the email body. Do NOT include Subject line or introductory chat (like 'Here is the email:').`;

      const userMessage = input.context 
        ? `Context:\n${input.context}\n\nUser Prompt: ${input.prompt}`
        : `User Prompt: ${input.prompt}`;

      const res = await openrouter.chat.completions.create({
        model: AGENT_MODELS.fast,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
      });

      return {
        draft: res.choices[0]?.message?.content || "",
      };
    }),
});
