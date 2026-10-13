CREATE TABLE "slack_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"startup_id" uuid NOT NULL,
	"slack_team_id" text NOT NULL,
	"slack_team_name" text NOT NULL,
	"bot_token" text NOT NULL,
	"installed_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slack_connections_startup_id_unique" UNIQUE("startup_id"),
	CONSTRAINT "slack_connections_slack_team_id_unique" UNIQUE("slack_team_id")
);
--> statement-breakpoint
CREATE TABLE "slack_posts" (
	"slack_team_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"message_ts" text NOT NULL,
	"post_id" uuid NOT NULL,
	CONSTRAINT "slack_posts_slack_team_id_channel_id_message_ts_pk" PRIMARY KEY("slack_team_id","channel_id","message_ts")
);
--> statement-breakpoint
ALTER TABLE "slack_connections" ADD CONSTRAINT "slack_connections_startup_id_startups_id_fk" FOREIGN KEY ("startup_id") REFERENCES "public"."startups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slack_connections" ADD CONSTRAINT "slack_connections_installed_by_users_id_fk" FOREIGN KEY ("installed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slack_posts" ADD CONSTRAINT "slack_posts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;