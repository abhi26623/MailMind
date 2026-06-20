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
            
            // Auto-Triage: Try to fetch insight if we have thread info and tenant context.
            const tenantId = typeof ctx.tenantId === 'string' ? ctx.tenantId : undefined;
            if (tenantId && data?.threadId) {
                generateAndSaveInsight({
                    tenantId,
                    threadId: String(data.threadId),
                    snippet: typeof data.snippet === 'string' ? data.snippet : undefined,
                    subject: typeof data.subject === 'string' ? data.subject : undefined
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