CREATE TABLE "waitlist_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"source" text NOT NULL,
	"position" integer,
	"signed_up_at" timestamp with time zone,
	"verified" boolean,
	"invited_at" timestamp with time zone,
	"joined_user_id" uuid,
	"joined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_entries_email_unique" UNIQUE("email"),
	CONSTRAINT "waitlist_entries_source_check" CHECK ("waitlist_entries"."source" in ('csv', 'getwaitlist'))
);
--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_joined_user_id_users_id_fk" FOREIGN KEY ("joined_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "waitlist_entries_order_idx" ON "waitlist_entries" USING btree ("position","signed_up_at");