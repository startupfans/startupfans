import { and, eq } from "drizzle-orm";
import type postgres from "postgres";
import { db } from "../db/index";
import { posts, startupMembers, startups, users } from "../db/schema";

export async function seedStartupFans() {
  const emails = [...new Set((process.env.SEED_OWNER_EMAILS ?? "")
    .split(",").map((email) => email.trim().toLowerCase()))];
  if (emails.some((email) => !email || email.length > 254 ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email) ||
    email.startsWith(".") || email.includes("..") || email.includes(".@") ||
    email.split("@")[0].length > 64)) {
    throw new Error("SEED_OWNER_EMAILS is required and must contain valid comma-separated emails.");
  }

  const messages = await db.transaction(async (tx) => {
    const messages: string[] = [];
    const owners: (typeof users.$inferSelect)[] = [];
    for (const email of emails) {
      const [created] = await tx.insert(users).values({ email })
        .onConflictDoNothing({ target: users.email }).returning();
      const [owner] = created ? [created] : await tx.select().from(users)
        .where(eq(users.email, email)).limit(1);
      if (!owner) throw new Error(`Could not upsert owner ${email}`);
      owners.push(owner);
      messages.push(`${created ? "Created" : "Skipped existing"} user: ${email}`);
    }
    const firstOwner = owners[0];
    if (!firstOwner) throw new Error("At least one owner is required.");

    const profile = {
      name: "startupfans",
      tagline: "Be a fan before we're famous.",
      website: "https://www.startupfans.co",
      logoUrl: "/logo/startupfans-mark-on-light.svg",
      stage: "pre-seed",
    };
    const [created] = await tx.insert(startups).values({
      ...profile, slug: "startupfans", createdBy: firstOwner.id,
    }).onConflictDoNothing({ target: startups.slug }).returning();
    // Serialize repeat runs with the same row lock used by the follow helper.
    const [startup] = await tx.select().from(startups)
      .where(eq(startups.slug, "startupfans")).for("update");
    if (!startup) throw new Error("Could not upsert startupfans.");
    if (created) {
      messages.push("Created startup: startupfans");
    } else if (startup.name !== profile.name || startup.tagline !== profile.tagline ||
      startup.website !== profile.website || startup.logoUrl !== profile.logoUrl ||
      startup.stage !== profile.stage) {
      await tx.update(startups).set(profile).where(eq(startups.id, startup.id));
      messages.push("Updated startup: startupfans");
    } else {
      messages.push("Skipped existing startup: startupfans");
    }

    for (const owner of owners) {
      const [membership] = await tx.select().from(startupMembers).where(and(
        eq(startupMembers.startupId, startup.id), eq(startupMembers.userId, owner.id),
      )).limit(1);
      if (membership?.role === "owner") {
        messages.push(`Skipped existing owner: ${owner.email}`);
      } else {
        await tx.insert(startupMembers).values({
          startupId: startup.id, userId: owner.id, role: "owner",
        }).onConflictDoUpdate({
          target: [startupMembers.startupId, startupMembers.userId], set: { role: "owner" },
        });
        messages.push(`${membership ? "Promoted" : "Created"} owner: ${owner.email}`);
      }
    }

    const [existingPost] = await tx.select({ id: posts.id }).from(posts)
      .where(eq(posts.startupId, startup.id)).limit(1);
    if (existingPost) {
      messages.push("Skipped first post: startup already has posts");
    } else {
      await tx.insert(posts).values({
        startupId: startup.id,
        authorId: firstOwner.id,
        bodyMd: "first post. we're building startupfans in the open and this is where the updates land. follow along.",
      });
      messages.push("Created first post");
    }
    return messages;
  });
  for (const message of messages) console.log(message);
}

async function main() {
  try {
    await seedStartupFans();
  } finally {
    const databaseRuntime: typeof globalThis & {
      startupfansPostgres?: ReturnType<typeof postgres>;
    } = globalThis;
    const sql = databaseRuntime.startupfansPostgres;
    if (sql) await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
