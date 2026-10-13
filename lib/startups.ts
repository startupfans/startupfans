import "server-only";

import { asc, count, desc, eq, and, getTableColumns, sql } from "drizzle-orm";
import { unionAll } from "drizzle-orm/pg-core";
import { cache } from "react";
import { db } from "@/db";
import { follows, posts, startupFollows, startupMembers, startups, users } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { getMediaFormat, isMediaFilename } from "@/lib/media";

export const startupFanCount = sql`(
  (select count(*) from ${follows} where ${follows.startupId} = ${startups.id})
  + (select count(*) from ${startupFollows} where ${startupFollows.startupId} = ${startups.id})
)`.mapWith(Number);

export function formatStartupCount(value: number, noun: "fan" | "startup") {
  return `${value.toLocaleString("en-GB")} ${noun}${value === 1 ? "" : "s"}`;
}

export function isStartupProfileImageUrl(value: string, slug: string, creatorId?: string) {
  if (!value) return true;
  if (value.length > 500 || !value.startsWith("https://")) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    if (!url.hostname.endsWith(".blob.vercel-storage.com")) return true;
    const prefix = `/startups/${slug}/profile/`;
    const filename = url.pathname.slice(prefix.length);
    return /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i.test(url.hostname)
      && !url.port && !url.search && !url.hash && url.pathname.startsWith(prefix)
      && isMediaFilename(filename) && getMediaFormat(filename)?.type === "image"
      && (!creatorId || filename.startsWith(`${creatorId}-`));
  } catch {
    return false;
  }
}

export const getStartupBySlug = cache(async (slug: string) => {
  const [startup] = await db.select({
    ...getTableColumns(startups),
    followingCount: sql`(select count(*) from ${startupFollows} where ${startupFollows.followerStartupId} = ${startups.id})`.mapWith(Number),
    memberCount: sql`(select count(*) from ${startupMembers} where ${startupMembers.startupId} = ${startups.id})`.mapWith(Number),
  }).from(startups).where(eq(startups.slug, slug)).limit(1);
  return startup ?? null;
});

export async function createStartup(input: typeof startups.$inferInsert) {
  return db.transaction(async (tx) => {
    const [startup] = await tx.insert(startups).values(input)
      .onConflictDoNothing({ target: startups.slug }).returning();
    if (!startup) return null;

    // The creator joins as an owner, never as a fan of their own startup.
    await tx.insert(startupMembers).values({
      startupId: startup.id,
      userId: input.createdBy,
      role: "owner",
    });
    return startup;
  });
}

export async function getStartupMembers(startupId: string) {
  return db.select({ id: users.id, name: users.name, handle: users.handle, avatarUrl: users.avatarUrl, email: users.email, role: startupMembers.role })
    .from(startupMembers).innerJoin(users, eq(users.id, startupMembers.userId))
    .where(eq(startupMembers.startupId, startupId)).orderBy(asc(users.createdAt), asc(users.id));
}

export const getTeam = cache(async (startupId: string) => {
  const publicPosts = and(eq(posts.startupId, startupId), eq(posts.visibility, "public"));
  const totals = db.select({ authorId: posts.authorId, postCount: count().as("post_count") })
    .from(posts).where(publicPosts).groupBy(posts.authorId).as("team_post_totals");
  const latest = db.selectDistinctOn([posts.authorId], {
    authorId: posts.authorId,
    body: posts.bodyMd,
    publishedAt: posts.publishedAt,
  }).from(posts).where(publicPosts)
    .orderBy(asc(posts.authorId), desc(posts.publishedAt), desc(posts.id)).as("team_latest_posts");

  return db.select({
    id: users.id,
    name: users.name,
    handle: users.handle,
    email: users.email,
    avatarUrl: users.avatarUrl,
    role: startupMembers.role,
    joinedAt: startupMembers.createdAt,
    postCount: sql`coalesce(${totals.postCount}, 0)`.mapWith(Number),
    latestPostDate: latest.publishedAt,
    latestPostBody: latest.body,
  }).from(startupMembers)
    .innerJoin(users, eq(users.id, startupMembers.userId))
    .leftJoin(totals, eq(totals.authorId, users.id))
    .leftJoin(latest, eq(latest.authorId, users.id))
    .where(eq(startupMembers.startupId, startupId))
    .orderBy(asc(startupMembers.createdAt), asc(users.id));
});

export type TeamMember = Awaited<ReturnType<typeof getTeam>>[number];

export async function getStartupPosts(startupId: string) {
  return db.select({
    id: posts.id,
    body: posts.bodyMd,
    publishedAt: posts.publishedAt,
    authorName: users.name,
    authorHandle: users.handle,
    authorEmail: users.email,
  }).from(posts).innerJoin(users, eq(users.id, posts.authorId))
    .where(and(eq(posts.startupId, startupId), eq(posts.visibility, "public")))
    .orderBy(desc(posts.publishedAt), desc(posts.id));
}

export async function getStartupFanCount(startupId: string) {
  const [row] = await db.select({ count: startupFanCount }).from(startups)
    .where(eq(startups.id, startupId));
  return row?.count ?? 0;
}

export async function listAllStartups() {
  await requireAdmin();
  const rows = await db.select({
    name: startups.name,
    slug: startups.slug,
    logoUrl: startups.logoUrl,
    createdAt: startups.createdAt,
    fanCount: startupFanCount,
    memberCount: sql`(select count(*) from ${startupMembers} where ${startupMembers.startupId} = ${startups.id})`.mapWith(Number),
    totalCount: sql`count(*) over ()`.mapWith(Number),
  }).from(startups)
    .orderBy(desc(startups.createdAt), desc(startups.id))
    .limit(200);
  return { startups: rows, capped: (rows[0]?.totalCount ?? 0) > 200 };
}

function parseListCursor(cursor?: string) {
  if (!cursor || cursor.length > 160) return null;
  const match = /^(startup|person)\|(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z)\|([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i
    .exec(Buffer.from(cursor, "base64url").toString("utf8"));
  if (!match) return null;
  const timestamp = match[2];
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== timestamp.replace(/(\.\d{3})\d{3}Z$/, "$1Z")) return null;
  return { kind: match[1], timestamp, id: match[3] };
}

export async function listStartupFans(startupId: string, cursor?: string) {
  const before = parseListCursor(cursor);
  const fans = unionAll(
    db.select({
      kind: sql<"startup" | "person">`'startup'`.as("kind"),
      id: startups.id,
      name: sql<string | null>`${startups.name}`.as("name"),
      slug: sql<string | null>`${startups.slug}`.as("slug"),
      imageUrl: startups.logoUrl,
      memberNo: startupFollows.memberNo,
      createdAt: startupFollows.createdAt,
      cursorTimestamp: sql<string>`to_char(${startupFollows.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`.as("cursor_timestamp"),
    }).from(startupFollows).innerJoin(startups, eq(startups.id, startupFollows.followerStartupId))
      .where(eq(startupFollows.startupId, startupId)),
    db.select({
      kind: sql<"startup" | "person">`'person'`.as("kind"),
      id: users.id,
      name: users.name,
      slug: sql<string | null>`null::text`,
      imageUrl: users.avatarUrl,
      memberNo: follows.memberNo,
      createdAt: follows.createdAt,
      cursorTimestamp: sql<string>`to_char(${follows.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`.as("cursor_timestamp"),
    }).from(follows).innerJoin(users, eq(users.id, follows.userId))
      .where(eq(follows.startupId, startupId)),
  ).as("fans");
  const rows = await db.select().from(fans)
    .where(before ? sql`(${fans.kind}, ${fans.createdAt}, ${fans.id}) < (${before.kind}, ${before.timestamp}::timestamptz, ${before.id}::uuid)` : undefined)
    .orderBy(desc(fans.kind), desc(fans.createdAt), desc(fans.id)).limit(101);
  const page = rows.slice(0, 100);
  const last = page.at(-1);
  return {
    fans: page,
    nextCursor: rows.length > 100 && last
      ? Buffer.from(`${last.kind}|${last.cursorTimestamp}|${last.id}`).toString("base64url") : null,
  };
}

export async function listStartupFollowing(startupId: string, cursor?: string) {
  const before = parseListCursor(cursor);
  const rows = await db.select({
    id: startups.id, name: startups.name, slug: startups.slug,
    logoUrl: startups.logoUrl, tagline: startups.tagline, fanCount: startupFanCount,
    cursorTimestamp: sql<string>`to_char(${startupFollows.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
  }).from(startupFollows).innerJoin(startups, eq(startups.id, startupFollows.startupId))
    .where(and(
      eq(startupFollows.followerStartupId, startupId),
      before ? sql`(${startupFollows.createdAt}, ${startups.id}) < (${before.timestamp}::timestamptz, ${before.id}::uuid)` : undefined,
    ))
    .orderBy(desc(startupFollows.createdAt), desc(startups.id)).limit(101);
  const page = rows.slice(0, 100);
  const last = page.at(-1);
  return {
    startups: page,
    nextCursor: rows.length > 100 && last
      ? Buffer.from(`startup|${last.cursorTimestamp}|${last.id}`).toString("base64url") : null,
  };
}
