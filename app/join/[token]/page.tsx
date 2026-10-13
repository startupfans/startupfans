import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getValidStartupInvite } from "@/lib/invites";
import { acceptInviteAction } from "./actions";

export const metadata = { title: "Join a team on startupfans", robots: { index: false, follow: false } };

async function JoinPage({ params, searchParams }: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ invalid?: string | string[] }>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const invalid = query.invalid === "1";
  if (!await getCurrentUser()) {
    const next = `/join/${encodeURIComponent(token)}${invalid ? "?invalid=1" : ""}`;
    redirect(`/login?${new URLSearchParams({ next, invite: token })}`);
  }
  const invite = invalid ? null : await getValidStartupInvite(token);

  return (
    <main className="mx-auto min-h-screen min-w-0 max-w-xl break-words px-5 py-10 sm:py-20">
      <Link href="/" className="inline-flex min-h-11 items-center py-2 font-display text-xl font-extrabold">startupfans</Link>
      <section className="mt-10 rounded-3xl border-[3px] border-ink bg-sky p-6 shadow-sticker-lg sm:p-10">
        {invite ? (
          <>
            <h1 className="font-display text-4xl font-extrabold">Join {invite.name}.</h1>
            <p className="mt-5 text-lg">You&apos;re invited to share updates as part of the team.</p>
            <form action={acceptInviteAction.bind(null, token)} className="mt-8">
              <button type="submit" className="min-h-11 w-full rounded-xl border-[3px] border-ink bg-lime px-5 py-3 font-bold shadow-sticker">Join the team</button>
            </form>
          </>
        ) : (
          <>
            <h1 className="font-display text-4xl font-extrabold">This invite has closed.</h1>
            <p className="mt-5 text-lg">The link may have expired, been used, or been revoked. Ask the team owner for a fresh invite.</p>
            <Link href="/me" className="mt-6 inline-flex min-h-11 items-center py-2 font-bold underline underline-offset-4">Go to your account</Link>
          </>
        )}
      </section>
    </main>
  );
}

export { JoinPage as default };
