CREATE TABLE "availability_blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"date" date NOT NULL,
	"hour_start" integer NOT NULL,
	"hour_end" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduling_negotiations" (
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
);
