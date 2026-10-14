CREATE TABLE "post_reshares" (
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_reshares_post_id_user_id_pk" PRIMARY KEY("post_id","user_id"),
	CONSTRAINT "post_reshares_note_length" CHECK ("post_reshares"."note" is null or char_length("post_reshares"."note") between 1 and 280)
);
--> statement-breakpoint
ALTER TABLE "post_reshares" ADD CONSTRAINT "post_reshares_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_reshares" ADD CONSTRAINT "post_reshares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_reshares_created_at_post_id_idx" ON "post_reshares" USING btree ("created_at","post_id");--> statement-breakpoint
CREATE INDEX "post_reshares_user_id_idx" ON "post_reshares" USING btree ("user_id");