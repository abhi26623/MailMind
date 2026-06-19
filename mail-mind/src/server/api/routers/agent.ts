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
        model: AGENT_MODELS.geminiFlashLite.model,
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
  polishTone: protectedProcedure
    .input(z.object({
      text: z.string(),
      tone: z.enum(["professional", "shorter", "grammar"]),
    }))
    .mutation(async ({ input }) => {
      const { openrouter, AGENT_MODELS } = await import("@/lib/ai");
      
      let instruction = "";
      if (input.tone === "professional") instruction = "Rewrite this email text to be more professional and polite, keeping the same core meaning.";
      else if (input.tone === "shorter") instruction = "Rewrite this email text to be concise and shorter, removing fluff but keeping the main point.";
      else if (input.tone === "grammar") instruction = "Fix any grammar, spelling, or punctuation errors in this email text, but do not change the style.";

      const systemPrompt = `You are an AI writing assistant. ${instruction}
Only output the revised text. Do not include introductory or concluding phrases like 'Here is the revised text:'.`;

      const res = await openrouter.chat.completions.create({
        model: AGENT_MODELS.geminiFlashLite.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input.text },
        ],
        temperature: 0.3,
      });

      return {
        polished: res.choices[0]?.message?.content || input.text,
      };
    }),
  generateSmartReplies: protectedProcedure
    .input(z.object({
      context: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { openrouter, AGENT_MODELS } = await import("@/lib/ai");
      
      const systemPrompt = `You are an AI Email Assistant. 
Analyze the provided email context and suggest exactly 3 short, distinct "quick reply" intents the user could choose from.
Make them actionable and concise, maximum 4 words each. Examples: "Accept Meeting", "Decline Politely", "Ask for details", "Say Thanks", "Follow up later".
Output them as a JSON array of 3 strings. Example: ["Accept Meeting", "Decline Politely", "Ask for more info"]`;

      const res = await openrouter.chat.completions.create({
        model: AGENT_MODELS.geminiFlashLite.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Context:\n${input.context}` },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      try {
        const content = res.choices[0]?.message?.content || "{}";
        // Attempt to parse JSON. Might be wrapped in an object or just a plain array depending on LLM output.
        // It's safer to extract array with regex or handle generic json
        const parsed = JSON.parse(content);
        const intents = Array.isArray(parsed) ? parsed : (parsed.intents || parsed.replies || parsed.options || ["Say Thanks", "Reply Later", "Ask for Info"]);
        return { intents: intents.slice(0, 3) as string[] };
      } catch (e) {
        return { intents: ["Say Thanks", "Reply Later", "Ask for Info"] };
      }
    }),
});
