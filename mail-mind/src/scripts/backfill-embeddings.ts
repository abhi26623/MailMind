import { db } from '@/server/db';
import { user } from '@/server/db/schema';
import { syncEmbeddingsForTenant } from '@/server/embeddings-sync';

async function backfill() {
  console.log('--- Starting Embeddings Backfill ---');
  
  // Get all users
  const users = await db.select({ id: user.id }).from(user);
  console.log(`Found ${users.length} users.`);
  
  for (const u of users) {
    console.log(`Syncing for user ${u.id}...`);
    await syncEmbeddingsForTenant(u.id);
  }
  
  console.log('--- Backfill Complete ---');
  process.exit(0);
}

backfill().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
