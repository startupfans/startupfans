update post_reactions set kind = 'heart' where kind = 'like';
--> statement-breakpoint
update comment_reactions set kind = 'heart' where kind = 'like';
--> statement-breakpoint
ALTER TABLE "comment_reactions" DROP CONSTRAINT "comment_reactions_kind_check";--> statement-breakpoint
ALTER TABLE "post_reactions" DROP CONSTRAINT "post_reactions_kind_check";--> statement-breakpoint
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_kind_check" CHECK ("comment_reactions"."kind" in ('heart', 'tomato'));--> statement-breakpoint
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_kind_check" CHECK ("post_reactions"."kind" in ('heart', 'tomato'));
