import { db } from "../src/server/db/index";
import { sql } from "drizzle-orm";

async function run() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "email_insights" (
        "id" text PRIMARY KEY NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        "thread_id" text NOT NULL,
        "priority" text NOT NULL,
        "category" text NOT NULL,
        "summary" text NOT NULL,
        "suggested_action" text NOT NULL,
        "reason" text NOT NULL,
        "extracted_date_time" text,
        "extracted_email" text,
        CONSTRAINT "email_insights_thread_id_unique" UNIQUE("thread_id")
    );
  `);
  console.log("Created email_insights table");
  process.exit(0);
}
run().catch(console.error);
