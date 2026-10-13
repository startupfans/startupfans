import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const plan = pgEnum("plan", ["free", "pro"]);
export const role = pgEnum("role", ["owner", "editor"]);
export const visibility = pgEnum("visibility", ["public", "fans"]);
export const mediaType = pgEnum("media_type", ["image", "video"]);
export const postSource = pgEnum("post_source", ["web", "slack"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
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

export const waitlistEntries = pgTable("waitlist_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  source: text("source", { enum: ["csv", "getwaitlist"] }).notNull(),
  position: integer("position"),
  signedUpAt: timestamp("signed_up_at", { withTimezone: true }),
  verified: boolean("verified"),
  invitedAt: timestamp("invited_at", { withTimezone: true }),
  joinedUserId: uuid("joined_user_id").references(() => users.id, { onDelete: "set null" }),
  joinedAt: timestamp("joined_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("waitlist_entries_source_check", sql`${table.source} in ('csv', 'getwaitlist')`),
  index("waitlist_entries_order_idx").on(table.position, table.signedUpAt),
]);

export const startups = pgTable("startups", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline"),
  description: text("description"),
  logoUrl: text("logo_url"),
  coverUrl: text("cover_url"),
  bio: text("bio"),
  location: text("location"),
  xHandle: text("x_handle"),
  linkedinUrl: text("linkedin_url"),
  githubUrl: text("github_url"),
  instagramHandle: text("instagram_handle"),
  youtubeUrl: text("youtube_url"),
  tiktokHandle: text("tiktok_handle"),
  website: text("website"),
  stage: text("stage"),
  teamSize: integer("team_size"),
  isFounding: boolean("is_founding").notNull().default(false),
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("startup_members_startup_id_user_id_unique").on(table.startupId, table.userId)],
);

export const startupInvites = pgTable("startup_invites", {
  tokenHash: text("token_hash").primaryKey(),
  startupId: uuid("startup_id").notNull().references(() => startups.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    startupId: uuid("startup_id").notNull().references(() => startups.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull().references(() => users.id),
    bodyMd: text("body_md").notNull(),
    mediaUrl: text("media_url"),
    mediaType: mediaType("media_type"),
    mediaPosterUrl: text("media_poster_url"),
    source: postSource("source").notNull().default("web"),
    visibility: visibility("visibility").notNull().default("public"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("posts_startup_id_published_at_idx").on(table.startupId, table.publishedAt)],
);

export const slackConnections = pgTable("slack_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  startupId: uuid("startup_id").notNull().unique().references(() => startups.id, { onDelete: "cascade" }),
  slackTeamId: text("slack_team_id").notNull().unique(),
  slackTeamName: text("slack_team_name").notNull(),
  botToken: text("bot_token").notNull(),
  installedBy: uuid("installed_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const slackPosts = pgTable("slack_posts", {
  slackTeamId: text("slack_team_id").notNull(),
  channelId: text("channel_id").notNull(),
  messageTs: text("message_ts").notNull(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.slackTeamId, table.channelId, table.messageTs] })]);

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

export const postReports = pgTable(
  "post_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "set null" }),
    reason: text("reason").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    unique("post_reports_post_id_reporter_id_unique").on(table.postId, table.reporterId),
    check("post_reports_reason_length", sql`char_length(${table.reason}) <= 500`),
    index("post_reports_post_id_idx").on(table.postId),
  ],
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    // Namespaced hashes of email addresses or IP addresses, never the raw values.
    email: text("email").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.email, table.windowStart] }),
    index("login_attempts_window_start_idx").on(table.windowStart),
  ],
);
