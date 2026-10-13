CREATE TABLE "startup_follows" (
	"follower_startup_id" uuid NOT NULL,
	"startup_id" uuid NOT NULL,
	"member_no" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "startup_follows_follower_startup_id_startup_id_pk" PRIMARY KEY("follower_startup_id","startup_id"),
	CONSTRAINT "startup_follows_startup_id_member_no_unique" UNIQUE("startup_id","member_no"),
	CONSTRAINT "startup_follows_no_self_follow" CHECK ("startup_follows"."follower_startup_id" <> "startup_follows"."startup_id")
);
--> statement-breakpoint
ALTER TABLE "startup_follows" ADD CONSTRAINT "startup_follows_follower_startup_id_startups_id_fk" FOREIGN KEY ("follower_startup_id") REFERENCES "public"."startups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "startup_follows" ADD CONSTRAINT "startup_follows_startup_id_startups_id_fk" FOREIGN KEY ("startup_id") REFERENCES "public"."startups"("id") ON DELETE cascade ON UPDATE no action;