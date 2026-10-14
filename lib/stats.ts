import "server-only";

import { count, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { posts, startups, users } from "@/db/schema";

export interface PlatformStats {
  fans: number;
  startups: number;
  updates: number;
}

export const getPlatformStats = unstable_cache(
  async (): Promise<PlatformStats> => {
    const [fansRow, startupsRow, updatesRow] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(startups),
      db
        .select({ count: count() })
        .from(posts)
        .where(eq(posts.visibility, "public")),
    ]);

    return {
      fans: fansRow[0]?.count ?? 0,
      startups: startupsRow[0]?.count ?? 0,
      updates: updatesRow[0]?.count ?? 0,
    };
  },
  ["platform-stats"],
  { revalidate: 30 },
);
