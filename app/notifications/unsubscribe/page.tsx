import type { Metadata } from "next";
import Link from "next/link";
import { unsubscribeNotificationEmail } from "@/lib/notifications";

export const metadata: Metadata = { title: "Email preferences · startupfans", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export async function NotificationUnsubscribePage({ searchParams }: {
  searchParams: Promise<{ user?: string | string[]; kind?: string | string[]; token?: string | string[] }>;
}) {
  const { user, kind, token } = await searchParams;
  const valid = typeof user === "string" && typeof kind === "string" && typeof token === "string"
    && await unsubscribeNotificationEmail(user, kind, token);
  return <main className="mx-auto min-h-screen max-w-xl px-5 py-10 sm:px-8 sm:py-20">
    <Link href="/" className="inline-flex min-h-11 items-center font-display text-xl">startupfans</Link>
    <section className="mt-8 rounded-3xl border-[3px] border-ink bg-cream p-6 shadow-sticker-lg sm:p-10">
      <span className="rounded-full border-2 border-ink bg-lime px-3 py-1">email preferences</span>
      <h1 className="mt-6 font-display text-3xl font-extrabold">{valid ? "these emails are off" : "this link didn’t work"}</h1>
      <p className="mt-4">{valid ? "you won’t get email for this kind of update. your other preferences stay as you chose them." : "use the link in your latest email, or change your preferences below."}</p>
      <Link href="/me/notifications" className="mt-6 inline-flex min-h-11 items-center rounded-full border-2 border-ink bg-pink px-5 py-2 shadow-sticker">manage what we email you</Link>
    </section>
  </main>;
}

export { NotificationUnsubscribePage as default };
