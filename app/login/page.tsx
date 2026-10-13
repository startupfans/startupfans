import { SubmitButton } from "@/app/components/submit-button";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser, getSafeNextPath } from "@/lib/auth";
import { isInviteToken } from "@/lib/invites";
import { requestMagicLink } from "./actions";
import { CopyMagicLinkButton } from "./dev-inbox";

async function getDevLink(value: unknown): Promise<string | null> {
  if (typeof value !== "string") return null;

  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  if (!host || (protocol !== "http" && protocol !== "https")) return null;

  try {
    const origin = new URL(`${protocol}://${host}`).origin;
    const link = new URL(value);
    if (
      link.origin !== origin ||
      link.pathname !== "/auth/verify" ||
      link.username ||
      link.password ||
      !/^[0-9a-f]{64}$/.test(link.searchParams.get("token") ?? "")
    ) {
      return null;
    }
    return link.toString();
  } catch {
    return null;
  }
}

export async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (await getCurrentUser()) redirect("/me");

  const query = await searchParams;
  const next = getSafeNextPath(query.next);
  const invite = typeof query.invite === "string" && isInviteToken(query.invite) ? query.invite : "";
  const sent = typeof query.sent === "string" ? query.sent : null;
  const devLink = sent && process.env.NODE_ENV !== "production"
    ? await getDevLink(query.dev_link)
    : null;
  const error = query.error === "invite-only"
    ? "startupfans is invite-only for now. Join the waitlist and we'll let you in."
    : query.error === "rate-limit"
    ? "Too many sign-in links requested. Try again in a few minutes."
    : query.error === "expired"
    ? "That link has expired or has already been used. Request a fresh one below."
    : query.error === "invalid"
      ? "Please enter a valid email address."
      : query.error === "sending"
        ? "We couldn't send your link. Please try again in a moment."
        : null;

  return (
    <main className="mx-auto min-h-screen min-w-0 max-w-xl break-words px-5 py-10 sm:py-20">
      <Link href="/" className="inline-flex min-h-11 items-center py-2 font-display text-xl font-extrabold tracking-tight">
        startupfans
      </Link>
      <section className="mt-10 rounded-3xl border-[3px] border-ink bg-cream p-6 shadow-sticker-lg sm:p-10">
        <span className="inline-block -rotate-3 rounded-full border-2 border-ink bg-lime px-4 py-1 font-mono text-xs font-bold uppercase shadow-sticker">
          Your fan club pass
        </span>
        <h1 className="mt-8 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          {sent ? "Check your inbox" : "Sign in"}
        </h1>
        {sent ? (
          <p role="status" className="mt-5 break-words text-lg">We sent a sign-in link to <strong>{sent}</strong>. It expires in 15 minutes.</p>
        ) : (
          <p className="mt-5 text-lg text-ink/80">Use the email your invite went to.</p>
        )}
        {devLink && (
          <aside className="mt-6 rounded-2xl border-[3px] border-ink bg-sun p-5 shadow-sticker">
            <h2 className="font-display text-xl font-extrabold">Your inbox (dev only)</h2>
            <p className="mt-4 font-bold">Your startupfans sign-in link</p>
            <pre className="mt-3 whitespace-pre-wrap break-all rounded-xl border-2 border-ink bg-white p-3 font-mono text-sm">
              <code>{devLink}</code>
            </pre>
            <div className="mt-4 flex flex-wrap items-start gap-4">
              <CopyMagicLinkButton link={devLink} />
              <a
                href={devLink}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border-2 border-ink bg-pink px-4 py-2 font-bold shadow-sticker transition hover:-translate-y-0.5 active:translate-y-0 active:shadow-none sm:w-auto"
              >
                Sign in
              </a>
            </div>
          </aside>
        )}
        {error && (
          <p role="alert" className="mt-6 rounded-xl border-2 border-ink bg-sun p-4 font-semibold">
            {error}
          </p>
        )}
        {query.error === "invite-only" && (
          <Link href="/#join" className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl border-[3px] border-ink bg-lime px-5 py-3 font-bold shadow-sticker sm:w-auto">
            Join the waitlist
          </Link>
        )}
        <form action={requestMagicLink} className="mt-8 space-y-4">
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="invite" value={invite} />
          <label htmlFor="email" className="block font-bold">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="you@example.com"
            defaultValue={sent ?? ""}
            className="min-h-11 w-full min-w-0 rounded-xl border-2 border-ink bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
          />
          <SubmitButton
            pendingLabel="Sending…"
            className="min-h-11 w-full min-w-0 rounded-xl border-[3px] border-ink bg-pink px-5 py-4 font-display text-lg font-extrabold shadow-sticker transition hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
          >
            Send me a sign-in link
          </SubmitButton>
        </form>
      </section>
    </main>
  );
}

export { LoginPage as default };
