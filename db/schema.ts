import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const plan = pgEnum("plan", ["free", "pro"]);
export const role = pgEnum("role", ["owner", "editor"]);
export const visibility = pgEnum("visibility", ["public", "fans"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const magicLinks = pgTable("magic_links", {
  tokenHash: text("token_hash").primaryKey(),
  email: text("email").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

export const startups = pgTable("startups", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline"),
  description: text("description"),
  logoUrl: text("logo_url"),
  website: text("website"),
  plan: plan("plan").notNull().default("free"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // Assign member_no in one transaction by incrementing fan_count and using its returned value.
  fanCount: integer("fan_count").notNull().default(0),
});

export const startupMembers = pgTable(
  "startup_members",
  {
    startupId: uuid("startup_id").notNull().references(() => startups.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: role("role").notNull(),
  },
  (table) => [unique("startup_members_startup_id_user_id_unique").on(table.startupId, table.userId)],
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    startupId: uuid("startup_id").notNull().references(() => startups.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull().references(() => users.id),
    title: text("title").notNull(),
    bodyMd: text("body_md").notNull(),
    visibility: visibility("visibility").notNull().default("public"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("posts_startup_id_published_at_idx").on(table.startupId, table.publishedAt)],
);

export const follows = pgTable(
  "follows",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    startupId: uuid("startup_id").notNull().references(() => startups.id, { onDelete: "cascade" }),
    memberNo: integer("member_no").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("follows_user_id_startup_id_unique").on(table.userId, table.startupId),
    unique("follows_startup_id_member_no_unique").on(table.startupId, table.memberNo),
    index("follows_startup_id_idx").on(table.startupId),
  ],
);

export const emailEvents = pgTable(
  "email_events",
  {
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("email_events_post_id_user_id_unique").on(table.postId, table.userId)],
);
