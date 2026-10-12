CREATE TABLE "login_attempts" (
	"email" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "login_attempts_email_window_start_pk" PRIMARY KEY("email","window_start")
);
--> statement-breakpoint
CREATE TABLE "post_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"reporter_id" uuid,
	"reason" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "post_reports_post_id_reporter_id_unique" UNIQUE("post_id","reporter_id"),
	CONSTRAINT "post_reports_reason_length" CHECK (char_length("post_reports"."reason") <= 500)
);
--> statement-breakpoint
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "login_attempts_window_start_idx" ON "login_attempts" USING btree ("window_start");--> statement-breakpoint
CREATE INDEX "post_reports_post_id_idx" ON "post_reports" USING btree ("post_id");