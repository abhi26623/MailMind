import postgres from "postgres";

const REQUIRED_URL_MESSAGE = "DATABASE_URL is required to update production schema.";

export async function ensureProductionSchema() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(REQUIRED_URL_MESSAGE);
  }

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    await sql.begin(async (tx) => {
      await tx`
        CREATE TABLE IF NOT EXISTS "email_insights" (
          "id" text PRIMARY KEY NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
          "tenant_id" text DEFAULT 'legacy' NOT NULL,
          "thread_id" text NOT NULL,
          "priority" text NOT NULL,
          "category" text NOT NULL,
          "summary" text NOT NULL,
          "suggested_action" text NOT NULL,
          "reason" text NOT NULL,
          "extracted_date_time" text,
          "extracted_email" text
        )
      `;

      await tx`
        CREATE TABLE IF NOT EXISTS "availability_blocks" (
          "id" text PRIMARY KEY NOT NULL,
          "tenant_id" text NOT NULL,
          "date" date NOT NULL,
          "hour_start" integer NOT NULL,
          "hour_end" integer NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL
        )
      `;

      await tx`
        CREATE TABLE IF NOT EXISTS "scheduling_negotiations" (
          "id" text PRIMARY KEY NOT NULL,
          "tenant_id" text NOT NULL,
          "thread_id" text,
          "recipient_email" text NOT NULL,
          "recipient_name" text,
          "duration" integer NOT NULL,
          "proposed_slots" jsonb DEFAULT '[]'::jsonb NOT NULL,
          "chosen_slot" jsonb,
          "status" text DEFAULT 'pending' NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL
        )
      `;

      await tx`
        CREATE TABLE IF NOT EXISTS "read_later_threads" (
          "id" text PRIMARY KEY NOT NULL,
          "tenant_id" text NOT NULL,
          "thread_id" text NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          CONSTRAINT "read_later_threads_thread_id_unique" UNIQUE("thread_id")
        )
      `;

      await tx`ALTER TABLE "email_insights" DROP CONSTRAINT IF EXISTS "email_insights_thread_id_unique"`;
      await tx`ALTER TABLE "email_insights" ADD COLUMN IF NOT EXISTS "tenant_id" text`;
      await tx`UPDATE "email_insights" SET "tenant_id" = 'legacy' WHERE "tenant_id" IS NULL`;
      await tx`ALTER TABLE "email_insights" ALTER COLUMN "tenant_id" SET NOT NULL`;
      await tx`ALTER TABLE "email_insights" ALTER COLUMN "tenant_id" DROP DEFAULT`;
      await tx`
        CREATE UNIQUE INDEX IF NOT EXISTS "email_insights_tenant_thread_idx"
        ON "email_insights" USING btree ("tenant_id", "thread_id")
      `;
    });

    await ensureVectorSchema(sql);
  } finally {
    await sql.end();
  }
}

async function ensureVectorSchema(sql) {
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    await sql.begin(async (tx) => {
      await tx`
        CREATE TABLE IF NOT EXISTS "email_embeddings" (
          "id" text PRIMARY KEY NOT NULL,
          "tenant_id" text NOT NULL,
          "entity_id" text NOT NULL,
          "embedding" vector(768) NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL
        )
      `;

      await tx`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = 'corsair_entities'
          )
          AND NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'email_embeddings_entity_id_corsair_entities_id_fk'
          ) THEN
            ALTER TABLE "email_embeddings"
            ADD CONSTRAINT "email_embeddings_entity_id_corsair_entities_id_fk"
            FOREIGN KEY ("entity_id")
            REFERENCES "public"."corsair_entities"("id")
            ON DELETE cascade
            ON UPDATE no action;
          END IF;
        END
        $$;
      `;

      await tx`
        CREATE INDEX IF NOT EXISTS "embeddingIndex"
        ON "email_embeddings" USING hnsw ("embedding" vector_cosine_ops)
      `;
    });
  } catch (error) {
    console.warn("Skipping vector schema bootstrap:", error);
  }
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  ensureProductionSchema()
    .then(() => {
      console.log("Production schema is ready.");
    })
    .catch((error) => {
      console.error("Production schema update failed:", error);
      process.exit(1);
    });
}
