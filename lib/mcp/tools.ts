import "server-only";

import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import * as z from "zod/v4";
import { McpServer, requireScopes } from "@modelcontextprotocol/server";
import { db } from "@/db";
import { follows, posts, startupMembers, startups, users } from "@/db/schema";
import { isAdmin } from "@/lib/admin";
import { createComment } from "@/lib/comments";
import { followStartup, unfollowStartup } from "@/lib/follows";
import { schedulePostLink } from "@/lib/links";
import { type McpActor, type McpScope } from "@/lib/mcp/policy";
import { captureMentionNotifications, listNotifications, notifyMentions } from "@/lib/notifications";
import { captureServerEvent } from "@/lib/posthog-server";
import { createPostForStartup } from "@/lib/posts";
import { allowRateLimit } from "@/lib/ratelimit";
import { isValidSessionId } from "@/lib/auth";

const slugSchema = z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/);
const postIdSchema = z.string().refine(isValidSessionId);

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

function fail(message: string) {
  return { isError: true as const, content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }] };
}

function excerpt(body: string, max = 500) {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

async function track(run: () => Promise<void>) {
  try {
    await run();
  } catch (error) {
    console.error("[startupfans] MCP analytics failed.", error instanceof Error ? error.message : "unknown");
  }
}

async function gate(actor: McpActor, scope: McpScope) {
  if (!actor.scopes.includes(scope)) return fail(`This connection needs the ${scope} scope.`);
  if (!await allowRateLimit(`mcp:${actor.id}`, 120)) return fail("Slow down a little.");
  return null;
}

async function startupBySlug(slug: string) {
  const [startup] = await db.select({
    id: startups.id,
    slug: startups.slug,
    name: startups.name,
    tagline: startups.tagline,
    bio: startups.bio,
    description: startups.description,
    website: startups.website,
    stage: startups.stage,
    location: startups.location,
    fanCount: startups.fanCount,
    logoUrl: startups.logoUrl,
  }).from(startups).where(eq(startups.slug, slug)).limit(1);
  return startup ?? null;
}

export function registerStartupFansTools(server: McpServer, actor: McpActor) {
  server.registerTool("whoami", {
    title: "Who am I",
    description: "The signed-in member and the startups they can post to.",
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    scopeChallenge: requireScopes("read"),
  }, async () => {
    const blocked = await gate(actor, "read");
    if (blocked) return blocked;
    const memberships = await db.select({
      slug: startups.slug,
      name: startups.name,
      role: startupMembers.role,
      fanCount: startups.fanCount,
    }).from(startupMembers)
      .innerJoin(startups, eq(startups.id, startupMembers.startupId))
      .where(eq(startupMembers.userId, actor.id))
      .orderBy(asc(startups.name), asc(startups.slug));
    return ok({ handle: actor.handle, name: actor.name, startups: memberships });
  });

  server.registerTool("find_startups", {
    title: "Find startups",
    description: "Find public startups by page address or name.",
    inputSchema: z.object({ query: z.string().trim().min(1).max(80) }),
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    scopeChallenge: requireScopes("read"),
  }, async ({ query }) => {
    const blocked = await gate(actor, "read");
    if (blocked) return blocked;
    const pattern = `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
    const rows = await db.select({
      slug: startups.slug,
      name: startups.name,
      tagline: startups.tagline,
      fanCount: startups.fanCount,
    }).from(startups)
      .where(or(
        eq(startups.slug, query.toLowerCase()),
        sql`${startups.name} ilike ${pattern} escape '\\'`,
      ))
      .orderBy(asc(startups.name), asc(startups.slug))
      .limit(8);
    return ok({ startups: rows });
  });

  server.registerTool("get_startup", {
    title: "Get a startup",
    description: "Read one public startup page, including whether the signed-in member is on the team or a fan.",
    inputSchema: z.object({ slug: slugSchema }),
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    scopeChallenge: requireScopes("read"),
  }, async ({ slug }) => {
    const blocked = await gate(actor, "read");
    if (blocked) return blocked;
    const startup = await startupBySlug(slug);
    if (!startup) return fail("This startup couldn't be found.");
    const [member] = await db.select({ role: startupMembers.role }).from(startupMembers)
      .where(and(eq(startupMembers.startupId, startup.id), eq(startupMembers.userId, actor.id))).limit(1);
    const [fan] = await db.select({ memberNo: follows.memberNo }).from(follows)
      .where(and(eq(follows.startupId, startup.id), eq(follows.userId, actor.id))).limit(1);
    return ok({
      ...startup,
      bio: startup.bio ? excerpt(startup.bio, 280) : null,
      description: startup.description ? excerpt(startup.description, 1000) : null,
      url: `${actor.origin}/s/${startup.slug}`,
      role: member?.role ?? null,
      fanNumber: fan?.memberNo ?? null,
    });
  });

  server.registerTool("list_posts", {
    title: "List startup posts",
    description: "Recent public posts for one startup.",
    inputSchema: z.object({ slug: slugSchema, limit: z.number().int().min(1).max(20).optional() }),
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    scopeChallenge: requireScopes("read"),
  }, async ({ slug, limit }) => {
    const blocked = await gate(actor, "read");
    if (blocked) return blocked;
    const rows = await db.select({
      id: posts.id,
      body: posts.bodyMd,
      publishedAt: posts.publishedAt,
      authorHandle: users.handle,
      authorName: users.name,
      mediaType: posts.mediaType,
    }).from(posts)
      .innerJoin(users, eq(users.id, posts.authorId))
      .innerJoin(startups, eq(startups.id, posts.startupId))
      .where(and(eq(startups.slug, slug), eq(posts.visibility, "public")))
      .orderBy(desc(posts.publishedAt), desc(posts.id))
      .limit(limit ?? 10);
    return ok({
      posts: rows.map((post) => ({ ...post, body: excerpt(post.body), url: `${actor.origin}/s/${slug}/p/${post.id}` })),
    });
  });

  server.registerTool("list_feed", {
    title: "List the feed",
    description: "The newest public posts across startups. Reshares are left out of this list.",
    inputSchema: z.object({ limit: z.number().int().min(1).max(20).optional() }),
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    scopeChallenge: requireScopes("read"),
  }, async ({ limit }) => {
    const blocked = await gate(actor, "read");
    if (blocked) return blocked;
    const rows = await db.select({
      id: posts.id,
      body: posts.bodyMd,
      publishedAt: posts.publishedAt,
      authorHandle: users.handle,
      startupSlug: startups.slug,
      startupName: startups.name,
    }).from(posts)
      .innerJoin(users, eq(users.id, posts.authorId))
      .innerJoin(startups, eq(startups.id, posts.startupId))
      .where(eq(posts.visibility, "public"))
      .orderBy(desc(posts.publishedAt), desc(posts.id))
      .limit(limit ?? 10);
    return ok({
      posts: rows.map((post) => ({
        ...post,
        body: excerpt(post.body, 280),
        url: `${actor.origin}/s/${post.startupSlug}/p/${post.id}`,
      })),
    });
  });

  server.registerTool("list_notifications", {
    title: "List mention notifications",
    description: "Recent mentions for the signed-in member. Reading this list does not mark them read.",
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    scopeChallenge: requireScopes("read"),
  }, async () => {
    const blocked = await gate(actor, "read");
    if (blocked) return blocked;
    const page = await listNotifications(actor.id);
    return ok({
      notifications: page.items.slice(0, 10).map((item) => ({
        id: item.id,
        unread: item.readAt === null,
        createdAt: item.createdAt,
        actorHandle: item.actorHandle,
        actorName: item.actorName,
        startupSlug: item.startupSlug,
        startupName: item.startupName,
        excerpt: excerpt(item.body, 280),
        url: `${actor.origin}/s/${item.startupSlug}/p/${item.postId}${item.commentId ? `#comment-${item.commentId}` : ""}`,
      })),
    });
  });

  server.registerTool("create_post", {
    title: "Post an update",
    description: "Publish a markdown update on a startup the member belongs to. Calling this twice publishes two updates.",
    inputSchema: z.object({ slug: slugSchema, body: z.string().trim().min(1).max(5000) }),
    annotations: { readOnlyHint: false, idempotentHint: false, destructiveHint: false, openWorldHint: true },
    scopeChallenge: requireScopes("write"),
  }, async ({ slug, body }) => {
    const blocked = await gate(actor, "write");
    if (blocked) return blocked;
    try {
      const post = await db.transaction(async (tx): Promise<
        { ok: false; error: string } | { ok: true; id: string; startupId: string; recipientCount: number }
      > => {
        if (!await allowRateLimit(`mcp-post:${actor.id}`, 30, tx)) return { ok: false, error: "Slow down a little." };
        const [member] = await tx.select({ startupId: startups.id }).from(startupMembers)
          .innerJoin(startups, eq(startups.id, startupMembers.startupId))
          .where(and(eq(startups.slug, slug), eq(startupMembers.userId, actor.id)))
          .for("share", { of: startupMembers });
        if (!member) return { ok: false, error: "Only team members can post here." };
        const created = await createPostForStartup({
          startupId: member.startupId, authorId: actor.id, body, media: null, source: "mcp",
        }, tx);
        const publishedId = created?.id;
        if (!publishedId) throw new Error("Could not create post");
        const recipientCount = await notifyMentions({ body: body.trim(), actorId: actor.id, postId: publishedId }, tx);
        return { ok: true, id: publishedId, startupId: member.startupId, recipientCount };
      });
      if (!post.ok) return fail(post.error);
      schedulePostLink({ postId: post.id, body: body.trim(), slug, actorId: actor.id });
      revalidatePath(`/s/${slug}`);
      revalidatePath(`/s/${slug}/p/${post.id}`);
      revalidatePath("/feed");
      await track(async () => {
        await captureMentionNotifications({
          actorId: actor.id, postId: post.id, startupId: post.startupId, recipientCount: post.recipientCount,
        });
        await captureServerEvent({
          distinctId: actor.id,
          event: "post_created",
          properties: { attachment_type: null, has_attachment: false, source: "mcp" },
        });
      });
      return ok({ id: post.id, url: `${actor.origin}/s/${slug}/p/${post.id}` });
    } catch (error) {
      console.error("[startupfans] MCP post failed.", error instanceof Error ? error.message : "unknown");
      return fail("We couldn't publish your update. Try again.");
    }
  });

  server.registerTool("delete_post", {
    title: "Delete a post",
    description: "Delete a public post the member wrote, or any post on a startup they own.",
    inputSchema: z.object({ postId: postIdSchema }),
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: true, openWorldHint: true },
    scopeChallenge: requireScopes("write"),
  }, async ({ postId }) => {
    const blocked = await gate(actor, "write");
    if (blocked) return blocked;
    const deleted = await db.transaction(async (tx) => {
      const [post] = await tx.select({
        slug: startups.slug, startupId: startups.id, authorId: posts.authorId,
      }).from(posts)
        .innerJoin(startups, eq(startups.id, posts.startupId))
        .where(eq(posts.id, postId))
        .for("update", { of: posts });
      if (!post) return null;
      if (!isAdmin(actor)) {
        const [member] = await tx.select({ role: startupMembers.role }).from(startupMembers)
          .where(and(eq(startupMembers.startupId, post.startupId), eq(startupMembers.userId, actor.id)))
          .for("share");
        if (!member || (member.role !== "owner" && post.authorId !== actor.id)) return false;
      }
      const [removed] = await tx.delete(posts).where(eq(posts.id, postId)).returning({ id: posts.id });
      return removed ? post.slug : false;
    });
    if (deleted === null) return fail("This post couldn't be found.");
    if (deleted === false) return fail("Only the author or a team owner can delete this post.");
    revalidatePath(`/s/${deleted}`);
    revalidatePath(`/s/${deleted}/p/${postId}`);
    revalidatePath("/feed");
    await track(() => captureServerEvent({
      distinctId: actor.id,
      event: "post_deleted",
      properties: { deleted_by_admin: isAdmin(actor) },
    }));
    return ok({ deleted: true, postId });
  });

  server.registerTool("reply_to_post", {
    title: "Reply to a post",
    description: "Reply to a public post. Fans and team members can reply. Someone who is neither gets an error and can follow first.",
    inputSchema: z.object({ postId: postIdSchema, body: z.string().trim().min(1).max(1000) }),
    annotations: { readOnlyHint: false, idempotentHint: false, destructiveHint: false, openWorldHint: true },
    scopeChallenge: requireScopes("write"),
  }, async ({ postId, body }) => {
    const blocked = await gate(actor, "write");
    if (blocked) return blocked;
    const [post] = await db.select({ slug: startups.slug }).from(posts)
      .innerJoin(startups, eq(startups.id, posts.startupId))
      .where(and(eq(posts.id, postId), eq(posts.visibility, "public")))
      .limit(1);
    if (!post) return fail("This post couldn't be found.");
    const result = await createComment(post.slug, postId, { id: actor.id, email: actor.email }, body);
    if (result.status === "error") return fail(result.message);
    revalidatePath(`/s/${post.slug}/p/${postId}`);
    revalidatePath(`/s/${post.slug}`);
    revalidatePath("/feed");
    await track(() => captureServerEvent({
      distinctId: actor.id,
      event: "comment_created",
      properties: { post_id: postId, startup_id: result.startupId },
    }));
    return ok({ url: `${actor.origin}/s/${post.slug}/p/${postId}` });
  });

  server.registerTool("follow_startup", {
    title: "Follow a startup",
    description: "Follow a startup as the signed-in member. Team members already belong and are not given a fan number.",
    inputSchema: z.object({ slug: slugSchema }),
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false, openWorldHint: true },
    scopeChallenge: requireScopes("write"),
  }, async ({ slug }) => {
    const blocked = await gate(actor, "write");
    if (blocked) return blocked;
    const startup = await startupBySlug(slug);
    if (!startup) return fail("This startup couldn't be found.");
    const result = await followStartup(actor.id, startup.id);
    if (result.status === "member") return fail("You're on the team, so you're already closer than a fan.");
    revalidatePath(`/s/${slug}`, "layout");
    revalidatePath("/feed");
    await track(() => captureServerEvent({ distinctId: actor.id, event: "startup_followed" }));
    return ok({ fanNumber: result.follow.memberNo, created: result.created });
  });

  server.registerTool("unfollow_startup", {
    title: "Unfollow a startup",
    description: "Stop following a startup. The fan number is not reused.",
    inputSchema: z.object({ slug: slugSchema }),
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false, openWorldHint: true },
    scopeChallenge: requireScopes("write"),
  }, async ({ slug }) => {
    const blocked = await gate(actor, "write");
    if (blocked) return blocked;
    const startup = await startupBySlug(slug);
    if (!startup) return fail("This startup couldn't be found.");
    await unfollowStartup(actor.id, startup.id);
    revalidatePath(`/s/${slug}`, "layout");
    revalidatePath("/feed");
    await track(() => captureServerEvent({ distinctId: actor.id, event: "startup_unfollowed" }));
    return ok({ following: false });
  });
}
