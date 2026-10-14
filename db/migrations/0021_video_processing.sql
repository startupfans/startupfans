ALTER TABLE "posts" ADD COLUMN "media_status" text DEFAULT 'ready' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "media_raw_url" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "media_processed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_media_status_check" CHECK ("posts"."media_status" in ('ready', 'processing', 'failed'));