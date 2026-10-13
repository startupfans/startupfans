import "server-only";

import { asc, inArray, sql } from "drizzle-orm";
import { cache } from "react";
import ReactMarkdown from "react-markdown";
import { db } from "@/db";
import { users, startupMembers, startups, follows, startupFollows } from "@/db/schema";

export type MentionSuggestion = {
  handle: string;
  name: string | null;
  avatarUrl: string | null;
  reason: "On the team" | "Fan" | "In your circle" | null;
};
export type MentionSegment = { text: string; handle: string | null };
export type MentionNode = {
  type: string;
  value?: string;
  url?: string;
  children?: MentionNode[];
  position?: { start: { offset?: number }; end: { offset?: number } };
  data?: { hProperties: Record<string, string | boolean> };
};

const mentionPattern = /(?<!\w)@([a-z0-9_]{3,24})(?!\w)/gi;
const excludedNodes = new Set(["code", "inlineCode", "link", "linkReference", "image", "imageReference", "definition", "html"]);

function mentionTokens(body: string) {
  return Array.from(body.matchAll(mentionPattern), (match) => ({
    text: match[0], handle: match[1].toLowerCase(), start: match.index, end: match.index + match[0].length,
  }));
}

export function parseMentions(body: string) {
  const excluded: { start: number; end: number }[] = [];
  function visit(node: MentionNode) {
    if (excludedNodes.has(node.type)) {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      if (start !== undefined && end !== undefined) excluded.push({ start, end });
      return;
    }
    node.children?.forEach(visit);
  }
  ReactMarkdown({ children: body, skipHtml: true, remarkPlugins: [() => visit] });
  return mentionTokens(body).filter((token) => !excluded.some((range) => token.start >= range.start && token.start < range.end));
}

// React's cache is scoped to a server render, including missing handles.
const mentionCache = cache(() => new Map<string, Promise<boolean>>());

export async function resolveMentions(bodies: readonly string[]) {
  const handles = [...new Set(bodies.flatMap((body) => parseMentions(body).map((token) => token.handle)))];
  const lookup = mentionCache();
  const missing = handles.filter((handle) => !lookup.has(handle));
  if (missing.length) {
    const query = db.select({ handle: users.handle }).from(users).where(inArray(users.handle, missing))
      .then((rows) => new Set(rows.map((user) => user.handle)));
    for (const handle of missing) lookup.set(handle, query.then((found) => found.has(handle)));
  }
  const results = await Promise.all(handles.map(async (handle) => await lookup.get(handle) ? handle : null));
  return new Set(results.filter((handle) => handle !== null));
}

export function mentionSegments(body: string, resolved: ReadonlySet<string>): MentionSegment[] {
  return segmentsFromTokens(body, parseMentions(body), resolved);
}

function segmentsFromTokens(body: string, tokens: ReturnType<typeof mentionTokens>, resolved: ReadonlySet<string>): MentionSegment[] {
  const segments: MentionSegment[] = [];
  let start = 0;
  for (const token of tokens) {
    if (!resolved.has(token.handle)) continue;
    if (token.start > start) segments.push({ text: body.slice(start, token.start), handle: null });
    segments.push({ text: token.text, handle: token.handle });
    start = token.end;
  }
  if (start < body.length) segments.push({ text: body.slice(start), handle: null });
  return segments;
}

export function mentionMarkdown(resolved: ReadonlySet<string>) {
  return () => (tree: MentionNode) => {
    function visit(node: MentionNode) {
      if (excludedNodes.has(node.type) || !node.children) return;
      node.children = node.children.flatMap((child): MentionNode[] => {
        if (child.type !== "text" || child.value === undefined) {
          visit(child);
          return [child];
        }
        return segmentsFromTokens(child.value, mentionTokens(child.value), resolved).map((segment) => segment.handle === null
          ? { type: "text", value: segment.text }
          : { type: "link", url: `/u/${segment.handle}`, children: [{ type: "text", value: segment.text }],
            data: { hProperties: { "data-mention": true } } });
      });
    }
    visit(tree);
  };
}

export async function suggestMentions(writerId: string, slug: string, query: string) {
  const prefix = `${query.replace(/[\\%_]/g, "\\$&")}%`;
  // Keep correlated references qualified inside Drizzle's single-table selection.
  const candidateId = sql`${users}.${sql.identifier("id")}`;
  const bucket = sql<number>`case
    when exists (select 1 from ${startupMembers} m join ${startups} s on s.id = m.startup_id
      where m.user_id = ${candidateId} and s.slug = ${slug}) then 0
    when exists (select 1 from ${follows} f join ${startups} s on s.id = f.startup_id
      where f.user_id = ${candidateId} and s.slug = ${slug}) then 1
    when exists (select 1 from ${startupMembers} circle_member where circle_member.user_id = ${candidateId}
      and (exists (select 1 from ${follows} f where f.user_id = ${writerId} and f.startup_id = circle_member.startup_id)
        or exists (select 1 from ${startupMembers} own where own.user_id = ${writerId} and own.startup_id = circle_member.startup_id)
        or exists (select 1 from ${startupFollows} sf join ${startupMembers} own on own.startup_id = sf.follower_startup_id
          where own.user_id = ${writerId} and sf.startup_id = circle_member.startup_id))) then 2
    else 3 end`;
  const rows = await db.select({ handle: users.handle, name: users.name, avatarUrl: users.avatarUrl, bucket })
    .from(users).where(sql`${users.id} <> ${writerId} and (${users.handle} ilike ${prefix} or ${users.name} ilike ${prefix})`)
    .orderBy(asc(bucket), sql`case when ${users.handle} ilike ${prefix} then 0 else 1 end`, asc(users.handle)).limit(8);
  const reasons = ["On the team", "Fan", "In your circle", null] as const;
  return rows.map(({ bucket: rank, ...user }): MentionSuggestion => ({ ...user, reason: reasons[rank] ?? null }));
}
