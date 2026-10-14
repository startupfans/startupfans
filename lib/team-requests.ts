import "server-only";

import { and, asc, count, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { follows, startupMembers, startups, teamJoinRequests, users } from "@/db/schema";
import { withOwnedStartup } from "@/lib/members";
import { captureServerEvent } from "@/lib/posthog-server";

export const teamJoinRequestLimit = 2;
export const teamJoinRequestCooldownMs = 7 * 24 * 60 * 60 * 1000;
export const joinRequestLimitCopy = "You get 2 join requests, ever, with a week between them. A declined request still counts.";

export type TeamJoinBlock = "member" | "pending" | "limit" | "cooldown";

export interface TeamJoinDecision {
  block: TeamJoinBlock | null;
  remaining: number;
  nextRequestAt: Date | null;
}

type RequestTeamJoinResult =
  | { status: "missing-startup" }
  | { status: "sent" }
  | { status: "blocked"; decision: TeamJoinDecision & { block: TeamJoinBlock } };

type JoinDatabase = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function decideTeamJoin(input: {
  member: boolean;
  pending: boolean;
  used: number;
  latest: Date | null;
  now: Date;
}): TeamJoinDecision {
  const remaining = Math.max(0, teamJoinRequestLimit - input.used);
  const nextRequestAt = input.latest ? new Date(input.latest.getTime() + teamJoinRequestCooldownMs) : null;
  if (input.member) return { block: "member", remaining, nextRequestAt };
  if (input.pending) return { block: "pending", remaining, nextRequestAt };
  if (remaining === 0) return { block: "limit", remaining, nextRequestAt };
  if (nextRequestAt && input.now < nextRequestAt) return { block: "cooldown", remaining, nextRequestAt };
  return { block: null, remaining, nextRequestAt };
}

export function formatRequestTime(date: Date) {
  return `${date.toLocaleString("en-GB", { timeZone: "UTC" })} UTC`;
}

export function joinRequestIntro(remaining: number) {
  const left = remaining === 1 ? "You have 1 left." : `You have ${remaining} left.`;
  return `${joinRequestLimitCopy} ${left}`;
}

export function joinRequestWarning(remaining: number) {
  if (remaining >= teamJoinRequestLimit) {
    return "This is request 1 of 2. After you send it, wait a week before the next one. A declined request still counts.";
  }
  return "This is your last join request. A declined request still counts, and you won't get another.";
}

export function blockedJoinRequestMessage(decision: TeamJoinDecision & { block: TeamJoinBlock }) {
  switch (decision.block) {
    case "member":
      return "You're already on this team.";
    case "pending":
      return "Request sent. An owner can add you from settings.";
    case "limit":
      return "You've used both join requests.";
    case "cooldown":
      return decision.nextRequestAt
        ? `You can send another request after ${formatRequestTime(decision.nextRequestAt)}.`
        : "You can send another request in a week.";
    default: {
      const unreachable: never = decision.block;
      return unreachable;
    }
  }
}

async function readTeamJoinFacts(database: JoinDatabase, userId: string, startupId: string) {
  const [summary] = await database.select({
    used: count().mapWith(Number),
    latest: max(teamJoinRequests.createdAt),
  }).from(teamJoinRequests).where(eq(teamJoinRequests.userId, userId));
  const [pending] = await database.select({ id: teamJoinRequests.id }).from(teamJoinRequests).where(and(
    eq(teamJoinRequests.userId, userId),
    eq(teamJoinRequests.startupId, startupId),
    eq(teamJoinRequests.status, "pending"),
  )).limit(1);
  const [member] = await database.select({ userId: startupMembers.userId }).from(startupMembers).where(and(
    eq(startupMembers.userId, userId),
    eq(startupMembers.startupId, startupId),
  )).limit(1);
  return {
    used: summary?.used ?? 0,
    latest: summary?.latest ?? null,
    pending: pending !== undefined,
    member: member !== undefined,
  };
}

export async function getTeamJoinAllowance(userId: string, startupId: string) {
  return decideTeamJoin({ ...await readTeamJoinFacts(db, userId, startupId), now: new Date() });
}

export async function countPendingTeamJoinRequests(startupId: string) {
  const [row] = await db.select({ total: count().mapWith(Number) }).from(teamJoinRequests).where(and(
    eq(teamJoinRequests.startupId, startupId),
    eq(teamJoinRequests.status, "pending"),
  ));
  return row?.total ?? 0;
}

export async function listPendingTeamJoinRequests(startupId: string) {
  return db.select({
    id: teamJoinRequests.id,
    createdAt: teamJoinRequests.createdAt,
    name: users.name,
    handle: users.handle,
    avatarUrl: users.avatarUrl,
  }).from(teamJoinRequests)
    .innerJoin(users, eq(users.id, teamJoinRequests.userId))
    .where(and(eq(teamJoinRequests.startupId, startupId), eq(teamJoinRequests.status, "pending")))
    .orderBy(asc(teamJoinRequests.createdAt), asc(teamJoinRequests.id));
}

export async function requestTeamJoin(userId: string, slug: string): Promise<RequestTeamJoinResult> {
  const result = await db.transaction(async (tx) => {
    // Lock the person first so two requests cannot both pass the lifetime cap.
    const [user] = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update").limit(1);
    if (!user) return { status: "missing-startup" } as const;
    const [startup] = await tx.select({ id: startups.id }).from(startups).where(eq(startups.slug, slug)).for("update").limit(1);
    if (!startup) return { status: "missing-startup" } as const;
    const decision = decideTeamJoin({ ...await readTeamJoinFacts(tx, userId, startup.id), now: new Date() });
    if (decision.block) return { status: "blocked" as const, decision: { ...decision, block: decision.block } };
    await tx.insert(teamJoinRequests).values({ startupId: startup.id, userId, status: "pending" });
    return { status: "sent" as const, startupId: startup.id, used: teamJoinRequestLimit - decision.remaining + 1 };
  });
  if (result.status === "sent") {
    await captureServerEvent({
      distinctId: userId,
      event: "team_join_requested",
      properties: { startup_id: result.startupId, requests_used: result.used },
    });
    return { status: "sent" };
  }
  return result;
}

async function resolveTeamJoinRequest<Status extends "accepted" | "declined">(
  slug: string,
  actorId: string,
  requestId: string,
  status: Status,
) {
  return withOwnedStartup(slug, actorId, async (tx, startup) => {
    const [request] = await tx.select({
      id: teamJoinRequests.id,
      userId: teamJoinRequests.userId,
    }).from(teamJoinRequests).where(and(
      eq(teamJoinRequests.id, requestId),
      eq(teamJoinRequests.startupId, startup.id),
      eq(teamJoinRequests.status, "pending"),
    )).for("update").limit(1);
    if (!request) return { status: "missing" } as const;
    if (status === "accepted") {
      await tx.insert(startupMembers).values({ startupId: startup.id, userId: request.userId, role: "editor" })
        .onConflictDoNothing({ target: [startupMembers.startupId, startupMembers.userId] });
      await tx.delete(follows).where(and(eq(follows.userId, request.userId), eq(follows.startupId, startup.id)));
    }
    await tx.update(teamJoinRequests).set({ status, resolvedAt: new Date(), resolvedBy: actorId })
      .where(eq(teamJoinRequests.id, request.id));
    return { status, startupId: startup.id } as const;
  });
}

export async function acceptTeamJoinRequest(slug: string, actorId: string, requestId: string) {
  const result = await resolveTeamJoinRequest(slug, actorId, requestId, "accepted");
  if (result.status === "accepted") {
    await captureServerEvent({
      distinctId: actorId,
      event: "team_join_request_accepted",
      properties: { startup_id: result.startupId },
    });
  }
  return result;
}

export async function declineTeamJoinRequest(slug: string, actorId: string, requestId: string) {
  const result = await resolveTeamJoinRequest(slug, actorId, requestId, "declined");
  if (result.status === "declined") {
    await captureServerEvent({
      distinctId: actorId,
      event: "team_join_request_declined",
      properties: { startup_id: result.startupId },
    });
  }
  return result;
}
