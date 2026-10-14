CREATE TABLE "post_links" (
	"post_id" uuid PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"canonical_url" text,
	"title" text,
	"description" text,
	"site_name" text,
	"image_url" text,
	"status" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_links_status_check" CHECK ("post_links"."status" in ('ready', 'none', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "post_links" ADD CONSTRAINT "post_links_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;