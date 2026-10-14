CREATE TABLE "comment_reactions" (
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comment_reactions_comment_id_user_id_pk" PRIMARY KEY("comment_id","user_id"),
	CONSTRAINT "comment_reactions_kind_check" CHECK ("comment_reactions"."kind" in ('like', 'heart', 'tomato'))
);
--> statement-breakpoint
ALTER TABLE "post_comments" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_comment_id_post_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."post_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comment_reactions_comment_id_kind_idx" ON "comment_reactions" USING btree ("comment_id","kind");
--> statement-breakpoint
INSERT INTO "comment_reactions" ("comment_id", "user_id", "kind", "created_at")
SELECT "comment_id", "user_id", 'heart', "created_at" FROM "comment_likes"
ON CONFLICT ("comment_id", "user_id") DO NOTHING;
