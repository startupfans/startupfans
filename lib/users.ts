import "server-only";

import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getMemberStartups, getFollowedStartups } from "@/lib/members";
import { getPublicUserPosts } from "@/lib/posts";

export const getPublicUser = cache(async (handle: string) => {
  if (!/^[a-z0-9_]{3,24}$/i.test(handle)) return null;
  const [user] = await db.select({
    id: users.id, handle: users.handle, name: users.name, avatarUrl: users.avatarUrl,
    xHandle: users.xHandle, linkedinUrl: users.linkedinUrl, githubUrl: users.githubUrl,
    instagramHandle: users.instagramHandle, youtubeUrl: users.youtubeUrl,
    tiktokHandle: users.tiktokHandle, createdAt: users.createdAt,
  }).from(users).where(eq(users.handle, handle.toLowerCase())).limit(1);
  if (!user) return null;
  const [memberStartups, followedStartups, posts] = await Promise.all([
    getMemberStartups(user.id), getFollowedStartups(user.id), getPublicUserPosts(user.id),
  ]);
  return { ...user, memberStartups, followedStartups, posts };
});
