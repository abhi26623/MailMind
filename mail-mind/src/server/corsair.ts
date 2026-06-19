import { createCorsair } from 'corsair';
import { gmail } from '@corsair-dev/gmail';
import { googlecalendar } from '@corsair-dev/googlecalendar';
import { conn } from './db';
import { generateAndSaveInsight } from './api/routers/insights';

export const corsair = createCorsair({
  plugins: [
    gmail({
      webhookHooks: {
        messageChanged: {
          after: async (ctx: Record<string, unknown>, result: Record<string, unknown>) => {
            const data = result.data as Record<string, unknown> | undefined;
            console.log('New email change:', data?.type);
            
            // Auto-Triage: Try to fetch insight if we have thread info
            if (data?.threadId) {
                // We'll pass whatever we have. OpenRouter will try to analyze.
                generateAndSaveInsight({
                    threadId: String(data.threadId),
                    snippet: data.snippet ? String(data.snippet) : undefined,
                    subject: data.subject ? String(data.subject) : undefined
                }).catch(err => console.error("Webhook insight error:", err));
            }

            // SSE emit is handled in /api/webhooks/route.ts after processWebhook
          }
        }
      }
    }),
    googlecalendar({
      webhookHooks: {
        onEventChanged: {
          after: async (ctx: Record<string, unknown>, result: Record<string, unknown>) => {
            const data = result.data as Record<string, unknown> | undefined;
            console.log('Calendar updated:', data?.type);
            // SSE emit is handled in /api/webhooks/route.ts after processWebhook
          }
        }
      }
    }),
  ],
  database: conn,
  kek: process.env.CORSAIR_KEK!,
  multiTenancy: true
});