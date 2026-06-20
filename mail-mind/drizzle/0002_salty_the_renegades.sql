CREATE TABLE "email_embeddings" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"entity_id" text NOT NULL,
	"embedding" vector(768) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "read_later_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "read_later_threads_thread_id_unique" UNIQUE("thread_id")
);
--> statement-breakpoint
ALTER TABLE "email_insights" DROP CONSTRAINT "email_insights_thread_id_unique";--> statement-breakpoint
ALTER TABLE "email_insights" ADD COLUMN "tenant_id" text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_insights" ALTER COLUMN "tenant_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "email_embeddings" ADD CONSTRAINT "email_embeddings_entity_id_corsair_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."corsair_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "embeddingIndex" ON "email_embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "email_insights_tenant_thread_idx" ON "email_insights" USING btree ("tenant_id","thread_id");