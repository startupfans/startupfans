import type { Metadata } from "next";
import { AppHeader } from "@/app/components/app-shell";
import { SubmitButton } from "@/app/components/submit-button";
import { requireUser } from "@/lib/auth";
import { getOauthClient } from "@/lib/mcp/oauth";
import { isCodeChallenge, isValidState, redirectUriError } from "@/lib/mcp/policy";
import { decideOauthConnectionAction } from "./actions";

export const metadata: Metadata = {
  title: "Connect an app on startupfans",
  robots: { index: false, follow: false },
};

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const query = await searchParams;
  const fields = {
    client_id: one(query.client_id),
    redirect_uri: one(query.redirect_uri),
    state: one(query.state),
    code_challenge: one(query.code_challenge),
    code_challenge_method: one(query.code_challenge_method) || "S256",
    response_type: one(query.response_type) || "code",
    scope: one(query.scope),
    resource: one(query.resource),
  };
  const next = `/oauth/authorize?${new URLSearchParams(fields)}`;
  await requireUser(next);
  const client = await getOauthClient(fields.client_id);
  const redirectOk = redirectUriError(fields.redirect_uri) === null
    && Boolean(client?.redirectUris.includes(fields.redirect_uri));
  const valid = Boolean(client) && redirectOk && isValidState(fields.state) && isCodeChallenge(fields.code_challenge);
  const host = redirectOk ? new URL(fields.redirect_uri).host : "";
  const rateLimited = query.error === "rate-limit";

  return (
    <div className="min-h-screen min-w-0">
      <AppHeader signedIn next={next} />
      <main className="mx-auto min-w-0 max-w-xl break-words px-5 pb-10 sm:px-8 sm:pb-16">
        <section className="rounded-3xl border-[3px] border-ink bg-cream p-6 shadow-sticker-lg sm:p-10">
          <span className="inline-block -rotate-2 rounded-full border-2 border-ink bg-sky px-4 py-1 font-mono text-xs font-bold uppercase shadow-sticker">
            App connection
          </span>
          <h1 className="mt-8 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Connect an app</h1>
          {rateLimited && (
            <p role="alert" className="mt-5 rounded-xl border-2 border-ink bg-sun p-4 font-semibold">
              Too many connection attempts. Try again in a few minutes.
            </p>
          )}
          {valid && client ? (
            <>
              <p className="mt-5 text-lg text-ink/80">
                <strong>{client.name}</strong> wants to use startupfans as you. It can read your feed, notifications and startups, and it can post, reply, follow and delete updates you could already change. It returns to <strong>{host}</strong>.
              </p>
              <form action={decideOauthConnectionAction} className="mt-8 flex flex-col gap-3">
                {Object.entries(fields).map(([name, value]) => (
                  <input key={name} type="hidden" name={name} value={value} />
                ))}
                <SubmitButton
                  name="decision"
                  value="allow"
                  pendingLabel="Connecting…"
                  autoFocus
                  className="min-h-11 w-full rounded-xl border-[3px] border-ink bg-pink px-5 py-4 font-display text-lg font-extrabold shadow-sticker transition hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
                >
                  Allow
                </SubmitButton>
                <SubmitButton
                  name="decision"
                  value="deny"
                  pendingLabel="Cancelling…"
                  variant="secondary"
                  className="min-h-11 w-full rounded-xl border-[3px] border-ink px-5 py-4 font-display text-lg font-extrabold shadow-sticker transition hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
                >
                  Cancel
                </SubmitButton>
              </form>
            </>
          ) : (
            <p role="alert" className="mt-5 text-lg">This connection link is not valid. Ask the app to start again.</p>
          )}
        </section>
      </main>
    </div>
  );
}
