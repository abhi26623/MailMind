import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { openrouter, AGENT_MODELS } from "@/lib/ai";
import { db } from "@/server/db";
import { emailInsights } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export async function generateAndSaveInsight(input: {
  threadId: string;
  subject?: string;
  snippet?: string;
  body?: string;
  from?: string;
}) {
  const existing = await db.query.emailInsights.findFirst({
    where: eq(emailInsights.threadId, input.threadId)
  });
  if (existing) {
    return existing;
  }

  if (!input.subject && !input.snippet && !input.body) {
     return null;
  }

  const prompt = `You are an AI Email Assistant. Classify and analyze the following email.
From: ${input.from || "Unknown"}
Subject: ${input.subject || "No Subject"}
Snippet: ${input.snippet || ""}
Body: ${input.body || ""}

Return exactly a JSON object (and nothing else) with the following structure:
{
  "priority": "urgent" | "high" | "normal" | "low",
  "category": "meeting" | "needs_reply" | "newsletter" | "receipt" | "personal" | "work" | "other",
  "summary": "1 sentence summary",
  "suggestedAction": "reply" | "schedule" | "archive" | "read" | "none",
  "reason": "short reason for the priority and action",
  "extractedDateTime": "string if any date/time mentioned, else null",
  "extractedEmail": "string if any attendee email is detected, else null"
}`;

  try {
    const response = await openrouter.chat.completions.create({
      model: AGENT_MODELS.geminiFlashLite.model,  // Lite — background classification, no need for full Flash
      temperature: 0.1,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    
    const insight = {
      id: `insight_${input.threadId}`,
      threadId: input.threadId,
      priority: parsed.priority || "normal",
      category: parsed.category || "other",
      summary: parsed.summary || "No summary",
      suggestedAction: parsed.suggestedAction || "none",
      reason: parsed.reason || "Processed by AI",
      extractedDateTime: parsed.extractedDateTime || null,
      extractedEmail: parsed.extractedEmail || null
    };

    await db.insert(emailInsights).values(insight).onConflictDoNothing();
    return insight;
  } catch (e) {
    console.error("Failed to generate insight:", e);
    return null;
  }
}

export const insightsRouter = createTRPCRouter({
  getThreadInsight: publicProcedure
    .input(z.object({
      threadId: z.string(),
      subject: z.string().optional(),
      snippet: z.string().optional(),
      body: z.string().optional(),
      from: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      return generateAndSaveInsight(input);
    }),

  getInsightsBatch: publicProcedure
    .input(z.object({ threadIds: z.array(z.string()) }))
    .query(async ({ ctx, input }) => {
      if (!input.threadIds.length) return [];
      const results = await db.query.emailInsights.findMany({
        where: (insights, { inArray }) => inArray(insights.threadId, input.threadIds)
      });
      return results;
    }),
});
