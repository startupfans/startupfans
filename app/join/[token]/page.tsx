import { AppHeader } from "@/app/components/app-shell";
import { SubmitButton } from "@/app/components/submit-button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getValidStartupInvite } from "@/lib/invites";
import { isStartupMember } from "@/lib/members";
import { acceptInviteAction } from "./actions";

export const metadata = { title: "Join a team on startupfans", robots: { index: false, follow: false } };

async function JoinPage({ params, searchParams }: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ invalid?: string | string[] }>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const invalid = query.invalid === "1";
  const user = await getCurrentUser();
  if (!user) {
    const next = `/join/${encodeURIComponent(token)}${invalid ? "?invalid=1" : ""}`;
    redirect(`/login?${new URLSearchParams({ next, invite: token })}`);
  }
  const invite = invalid ? null : await getValidStartupInvite(token, user.email);
  const member = invite ? await isStartupMember(invite.startupId, user.id) : false;

  return (
    <div className="min-h-screen min-w-0">
      <AppHeader signedIn next={`/join/${encodeURIComponent(token)}`} />
      <main className="mx-auto min-w-0 max-w-xl break-words px-5 pb-10 sm:px-8 sm:pb-16">
        <section className="rounded-3xl border-[3px] border-ink bg-sky p-6 shadow-sticker-lg sm:p-10">
          {invite && invite.invitedEmail === null && member ? (
            <>
              <h1 className="font-display text-4xl font-extrabold">You&apos;re already on the team</h1>
              <Link href={`/s/${invite.slug}`} className="mt-6 inline-flex min-h-11 items-center py-2 font-bold underline underline-offset-4">Go to {invite.name}</Link>
            </>
          ) : invite ? (
            <>
              <h1 className="font-display text-4xl font-extrabold">Join {invite.name}.</h1>
              <p className="mt-5 text-lg">{invite.inviterName || `@${invite.inviterHandle}`} invited you to join {invite.name}.</p>
              <form action={acceptInviteAction.bind(null, token)} className="mt-8">
                <SubmitButton pendingLabel="Joining…" className="min-h-11 w-full rounded-xl border-[3px] border-ink bg-lime px-5 py-3 font-bold shadow-sticker">Join the team</SubmitButton>
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
    </div>
  );
}

export { JoinPage as default };
