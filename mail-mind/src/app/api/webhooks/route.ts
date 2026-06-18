/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */
import { corsair } from '@/server/corsair'
import { processWebhook } from 'corsair'
import { db } from '@/server/db'
import { user, schedulingNegotiations } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { hashTenantId } from '@/lib/hash'
import { webhookBus } from '@/lib/events'
import { openrouter, AGENT_MODELS } from '@/lib/ai'

export async function POST(req: Request) {
  const url = new URL(req.url)
  const hashedTenantId = url.searchParams.get('tenantId')

  const bodyText = await req.text()
  let body: any = {}
  try { body = JSON.parse(bodyText || '{}') } catch { /* not JSON */ }

  // Build headers object from the request
  const headers: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    headers[key] = value
  })

  // Build query params object
  const query: Record<string, string> = {}
  url.searchParams.forEach((value, key) => {
    query[key] = value
  })

  console.log('[Webhook] POST received. Body keys:', Object.keys(body))

  // --- Resolve tenantId ---
  let tenantId: string | null = null

  // Calendar webhook -- tenantId comes as a hashed URL param
  if (hashedTenantId) {
    try {
      const users = await db.select({ id: user.id }).from(user)
      tenantId = users.find(u => hashTenantId(u.id) === hashedTenantId)?.id ?? null
    } catch (err) {
      console.error('[Webhook] DB error resolving calendar tenantId:', err)
    }
  }

  // Gmail Pub/Sub -- emailAddress is inside the base64-encoded message data
  if (!tenantId && body?.message?.data) {
    try {
      const data = JSON.parse(Buffer.from(body.message.data, 'base64').toString())
      console.log('[Webhook] Decoded Pub/Sub data:', data)
      if (data.emailAddress) {
        const found = await db.select({ id: user.id }).from(user).where(eq(user.email, data.emailAddress))
        tenantId = found[0]?.id ?? null
        if (!tenantId) {
          console.warn(`[Webhook] No user found for email: ${data.emailAddress}`)
        }
      }
    } catch (err) {
      console.error('[Webhook] Failed to decode Pub/Sub data:', err)
    }
  }

  if (!tenantId) {
    console.warn('[Webhook] Could not resolve tenantId from request')
    return new Response('Unknown tenant', { status: 400 })
  }

  console.log(`[Webhook] Resolved tenant: ${tenantId}`)

  // --- Process through Corsair ---
  try {
    const tenantCorsair = (corsair as any).withTenant(tenantId)
    const result = await processWebhook(tenantCorsair, headers, body, query)

    if (result.plugin) {
      console.log(`[Webhook] Handled by ${result.plugin}.${result.action}`)
    } else {
      console.log('[Webhook] No plugin matched -- still notifying SSE clients')
    }
  } catch (err) {
    console.error('[Webhook] processWebhook error (non-fatal):', err)
  }

  // --- Scheduling Reply Detection ---
  // Check if any new email matches an active scheduling negotiation thread
  try {
    const activeNegotiations = await db.query.schedulingNegotiations.findMany({
      where: eq(schedulingNegotiations.tenantId, tenantId),
    })
    const sentNegotiations = activeNegotiations.filter(n => n.status === 'sent' && n.threadId)

    if (sentNegotiations.length > 0) {
      // Fetch recent threads to check for replies
      const tenantCorsair = (corsair as any).withTenant(tenantId)
      const threads = await tenantCorsair.gmail.api.threads.list({ maxResults: 10, userId: 'me' })

      for (const neg of sentNegotiations) {
        const matchingThread = threads.threads?.find((t: any) => t.id === neg.threadId)
        if (!matchingThread) continue

        // Fetch full thread to get reply body
        const fullThread = await tenantCorsair.gmail.api.threads.get({ userId: 'me', id: neg.threadId })
        const messages = fullThread.messages || []
        
        // Skip if only our original message exists (no reply yet)
        if (messages.length <= 1) continue

        // Get the latest message (the reply)
        const latestMessage = messages[messages.length - 1]
        const replyBody = extractPlainTextBody(latestMessage)
        
        if (!replyBody) continue

        const slots = neg.proposedSlots as { start: string; end: string; label: string }[]

        // Fast regex extraction: look for "1", "2", "3" etc.
        let chosenIndex = -1
        for (let i = 0; i < slots.length; i++) {
          // Check for standalone number or slot label text
          const numPattern = new RegExp(`\\b${i + 1}\\b`)
          if (numPattern.test(replyBody) || replyBody.toLowerCase().includes(slots[i]!.label.toLowerCase())) {
            chosenIndex = i
            break
          }
        }

        // AI fallback if regex didn't match
        if (chosenIndex === -1) {
          try {
            const aiResult = await openrouter.chat.completions.create({
              model: AGENT_MODELS.geminiFlashLite.model,  // Lite — background task, no need for full Flash
              temperature: 0,
              messages: [{
                role: 'user',
                content: `The user was offered these meeting times:\n${slots.map((s, i) => `${i + 1}. ${s.label}`).join('\n')}\n\nThey replied: "${replyBody.substring(0, 500)}"\n\nWhich option did they choose? Reply with just the number (1, 2, or 3). If unclear, reply "0".`,
              }],
            })
            const num = parseInt(aiResult.choices[0]?.message?.content?.trim() ?? '0')
            if (num >= 1 && num <= slots.length) chosenIndex = num - 1
          } catch (aiErr) {
            console.warn('[Webhook] AI reply extraction failed:', aiErr)
          }
        }

        if (chosenIndex >= 0 && slots[chosenIndex]) {
          console.log(`[Webhook] Scheduling reply detected! ${neg.recipientEmail} chose option ${chosenIndex + 1}`)
          await db.update(schedulingNegotiations)
            .set({
              status: 'replied',
              chosenSlot: slots[chosenIndex],
              updatedAt: new Date(),
            })
            .where(eq(schedulingNegotiations.id, neg.id))
        }

        break // Only process one negotiation per webhook
      }
    }
  } catch (err) {
    console.error('[Webhook] Scheduling reply detection error (non-fatal):', err)
  }

  // --- Signal SSE via in-memory Event Bus (no DB bump needed) ---
  webhookBus.emit(tenantId)
  console.log(`[Webhook] SSE signaled via Event Bus for tenant: ${tenantId}`)

  return Response.json({ ok: true })
}

/**
 * Extract plain text body from a Gmail message object.
 */
function extractPlainTextBody(message: any): string {
  if (!message?.payload) return ''

  // Check top-level body
  if (message.payload.body?.data) {
    return Buffer.from(message.payload.body.data, 'base64').toString('utf-8')
  }

  // Check multipart parts
  const parts = message.payload.parts || []
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return Buffer.from(part.body.data, 'base64').toString('utf-8')
    }
  }

  // Nested multipart
  for (const part of parts) {
    if (part.parts) {
      for (const subPart of part.parts) {
        if (subPart.mimeType === 'text/plain' && subPart.body?.data) {
          return Buffer.from(subPart.body.data, 'base64').toString('utf-8')
        }
      }
    }
  }

  return ''
}
