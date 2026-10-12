CREATE TYPE "public"."media_type" AS ENUM('image', 'video');--> statement-breakpoint
CREATE TYPE "public"."post_source" AS ENUM('web', 'slack');--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "media_url" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "media_type" "media_type";--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "media_poster_url" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "source" "post_source" DEFAULT 'web' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN "title";