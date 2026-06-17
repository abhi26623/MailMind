/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */
import { corsair } from '@/server/corsair'
import { processWebhook } from 'corsair'
import { db } from '@/server/db'
import { user } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { hashTenantId } from '@/lib/hash'
import { webhookBus } from '@/lib/events'

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

  // --- Signal SSE via in-memory Event Bus (no DB bump needed) ---
  webhookBus.emit(tenantId)
  console.log(`[Webhook] SSE signaled via Event Bus for tenant: ${tenantId}`)

  return Response.json({ ok: true })
}
