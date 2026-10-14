CREATE TABLE "notification_settings" (
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"in_app" boolean DEFAULT true NOT NULL,
	"email" boolean DEFAULT true NOT NULL,
	"last_emailed_at" timestamp with time zone,
	CONSTRAINT "notification_settings_user_id_kind_pk" PRIMARY KEY("user_id","kind"),
	CONSTRAINT "notification_settings_kind_check" CHECK ("notification_settings"."kind" in ('mention', 'reply', 'reply_to_reply', 'new_fan', 'reshare', 'team_joined'))
);
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_recipient_source_unique";--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_kind_check";--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "post_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "startup_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "actor_startup_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "emailed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_paused" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_startup_id_startups_id_fk" FOREIGN KEY ("startup_id") REFERENCES "public"."startups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_startup_id_startups_id_fk" FOREIGN KEY ("actor_startup_id") REFERENCES "public"."startups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_source_unique" UNIQUE NULLS NOT DISTINCT("user_id","kind","post_id","comment_id","startup_id","actor_id","actor_startup_id");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_kind_check" CHECK ("notifications"."kind" in ('mention', 'reply', 'reply_to_reply', 'new_fan', 'reshare', 'team_joined'));