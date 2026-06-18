import { db } from '@/server/db';
import { corsairEntities, emailEmbeddings } from '@/server/db/schema';
import { eq, isNull, and, sql, inArray } from 'drizzle-orm';
import { embedText } from './embed';

export async function syncEmbeddingsForTenant(tenantId: string) {
  console.log(`[EmbeddingsSync] Starting sync for tenant ${tenantId}`);
  
  // Find all email/thread entities for this tenant that DO NOT have an embedding yet.
  // The Gmail Corsair plugin stores entities with entity_type = 'messages' or 'threads'.
  const emailsWithoutEmbeddings = await db
    .select({
      id: corsairEntities.id,
      data: corsairEntities.data,
      entityType: corsairEntities.entityType,
    })
    .from(corsairEntities)
    .leftJoin(emailEmbeddings, eq(corsairEntities.id, emailEmbeddings.entityId))
    .where(
      and(
        eq(corsairEntities.accountId, sql`(SELECT id FROM corsair_accounts WHERE tenant_id = ${tenantId} LIMIT 1)`),
        inArray(corsairEntities.entityType, ['messages', 'threads']),
        isNull(emailEmbeddings.id)
      )
    )
    .limit(50); // Process in batches to avoid blocking

  console.log(`[EmbeddingsSync] Found ${emailsWithoutEmbeddings.length} emails/threads without embeddings.`);

  for (const email of emailsWithoutEmbeddings) {
    try {
      // Extract text content from the entity data
      const data = email.data as any;
      const subject = data.subject || '';
      const snippet = data.snippet || '';
      const bodyText = data.body || data.textBody || '';
      const from = data.from || '';
      const to = data.to || '';
      
      const textToEmbed = `Subject: ${subject}\nFrom: ${from}\nTo: ${to}\n\nSnippet: ${snippet}\n\nBody: ${bodyText}`.substring(0, 8000);
      
      // Generate embedding
      const embedding = await embedText(textToEmbed);
      
      // Insert into DB
      await db.insert(emailEmbeddings).values({
        id: crypto.randomUUID(),
        tenantId,
        entityId: email.id,
        embedding,
      });
      
    } catch (err) {
      console.error(`[EmbeddingsSync] Failed to embed entity ${email.id}:`, err);
    }
  }
  
  console.log(`[EmbeddingsSync] Sync complete for tenant ${tenantId}`);
}
