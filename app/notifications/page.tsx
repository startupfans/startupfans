import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader, AppShell } from "@/app/components/app-shell";
import { BellIcon } from "@/app/components/icons";
import { PageHeader, SiteFooter } from "@/app/components/sticker";
import { requireUser } from "@/lib/auth";
import { listNotifications, markNotificationsRead, mentionExcerpt, notificationTarget } from "@/lib/notifications";
import { captureServerEvent } from "@/lib/posthog-server";
import { NotificationAvatar } from "./notification-avatar";
import { relativeDate } from "@/lib/relative-date";

export const metadata: Metadata = { title: "Notifications · startupfans", robots: { index: false, follow: false } };

export async function NotificationsPage({ searchParams }: {
  searchParams: Promise<{ cursor?: string | string[] }>;
}) {
  const { cursor } = await searchParams;
  const pageCursor = typeof cursor === "string" && cursor.length <= 128 ? cursor : undefined;
  const next = pageCursor ? `/notifications?cursor=${encodeURIComponent(pageCursor)}` : "/notifications";
  const user = await requireUser(next);
  const { items, nextCursor } = await listNotifications(user.id, pageCursor);
  await markNotificationsRead(user.id, items.map((item) => item.id));
  await captureServerEvent({ distinctId: user.id, event: "notifications_viewed", properties: { count: items.length } });

  return (
    <div className="min-h-screen min-w-0">
      <AppHeader signedIn next={next} />
      <AppShell className="max-w-3xl">
        <PageHeader title="Notifications" actions={<Link href="/me/notifications" className="inline-flex min-h-11 items-center rounded-full border-2 border-ink bg-cream px-4 py-2 shadow-sticker">notification settings</Link>} />
        {items.length === 0 ? (
          <div className="rounded-3xl border-[3px] border-ink bg-cream p-6 shadow-sticker">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink bg-pink"><BellIcon /></span>
            <p className="mt-4 font-display text-xl font-extrabold">All quiet for now.</p>
            <p className="mt-2 text-sm text-ink/70">mentions, replies, new fans and team updates will show up here.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => {
              const name = item.actorStartupName ?? (item.actorName?.trim() || item.actorHandle);
              const avatarUrl = item.actorStartupSlug ? item.actorStartupLogoUrl : item.actorAvatarUrl;
              const profilePath = item.actorStartupSlug ? `/s/${item.actorStartupSlug}` : `/u/${item.actorHandle}`;
              const sentences = {
                mention: `mentioned you in ${item.commentId ? "a reply" : "a post"} on ${item.startupName}`,
                reply: `replied to your post on ${item.startupName}`,
                reply_to_reply: "replied to your reply",
                new_fan: `is now a fan of ${item.startupName}`,
                reshare: `reshared your post on ${item.startupName}`,
                team_joined: `joined ${item.startupName}`,
              };
              const linkLabels = { mention: "see the mention", reply: "see the reply", reply_to_reply: "see the reply", new_fan: "meet your fans", reshare: "see the reshare", team_joined: "see your team" };
              const postPath = notificationTarget(item);
              return (
                <li key={item.id} className={`min-w-0 rounded-2xl border-[3px] border-ink bg-white p-4 shadow-sticker ${item.readAt === null ? "border-l-[6px] border-l-sun" : ""}`}>
                  <div className="flex min-w-0 gap-3">
                    <Link href={profilePath} aria-label={`View ${name}’s profile`} className="inline-flex h-11 w-11 shrink-0">
                      <NotificationAvatar src={avatarUrl} name={name} />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={profilePath} className="inline-flex min-h-11 max-w-full flex-wrap items-center gap-x-2 font-bold underline underline-offset-4">
                        <span className="break-words">{name}</span>{!item.actorStartupSlug && <span className="font-mono text-xs text-ink/60">@{item.actorHandle}</span>}
                      </Link>
                      <p className="text-sm">{sentences[item.kind]}</p>
                      <Link href={postPath} className="mt-2 block min-h-11 rounded-lg py-2 underline underline-offset-4">
                        {item.body && <p className="truncate text-sm">{item.kind === "mention" ? mentionExcerpt(item.body, user.handle, item.commentId === null) : item.body.slice(0, 160)}</p>}
                        <span className="text-xs text-ink/60">{linkLabels[item.kind]} · <time dateTime={item.createdAt.toISOString()} title={item.createdAt.toUTCString()}>{relativeDate(item.createdAt)}</time></span>
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {nextCursor && <Link href={`/notifications?cursor=${encodeURIComponent(nextCursor)}`} prefetch={false}
          className="mt-6 inline-flex min-h-11 items-center rounded-full border-2 border-ink bg-cream px-5 py-2 font-bold shadow-sticker">Older</Link>}
        <SiteFooter />
      </AppShell>
    </div>
  );
}

export { NotificationsPage as default };
