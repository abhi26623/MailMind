import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { emailEmbeddings, corsairEntities } from '@/server/db/schema';
import { cosineDistance, eq } from 'drizzle-orm';
import { embedText } from '@/server/embed';

export const searchRouter = createTRPCRouter({
  semanticSearch: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      // 1. Generate embedding for query
      const queryEmbedding = await embedText(input.query);

      // 2. Perform vector search using pgvector
      const results = await ctx.db
        .select({
          entityId: corsairEntities.id,
          entity: corsairEntities.data,
          distance: cosineDistance(emailEmbeddings.embedding, queryEmbedding),
        })
        .from(emailEmbeddings)
        .innerJoin(corsairEntities, eq(emailEmbeddings.entityId, corsairEntities.id))
        .where(eq(emailEmbeddings.tenantId, ctx.session.user.id))
        .orderBy(cosineDistance(emailEmbeddings.embedding, queryEmbedding))
        .limit(10);

      return results.map(r => ({
        id: r.entityId,
        ...(r.entity as any),
        score: 1 - (r.distance as number), // Convert distance to similarity score
      }));
    }),
});
