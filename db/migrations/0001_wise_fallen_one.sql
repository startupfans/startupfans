ALTER TABLE "startups" ADD COLUMN "stage" text;--> statement-breakpoint
ALTER TABLE "startups" ADD COLUMN "team_size" integer;--> statement-breakpoint
ALTER TABLE "startups" ADD COLUMN "is_founding" boolean DEFAULT false NOT NULL;