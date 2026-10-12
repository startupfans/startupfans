import Link from "next/link";
import { requireUser, signOut } from "@/lib/auth";

export default async function MePage() {
  const user = await requireUser("/me");

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 py-10 sm:py-20">
      <Link href="/" className="font-display text-xl font-extrabold tracking-tight">
        startupfans
      </Link>
      <section className="mt-10 rounded-3xl border-[3px] border-ink bg-sky p-6 shadow-sticker-lg sm:p-10">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">You&apos;re in.</h1>
        <p className="mt-5 break-words text-lg">Signed in as <strong>{user.email}</strong></p>
        <form action={signOut} className="mt-8">
          <button
            type="submit"
            className="rounded-xl border-[3px] border-ink bg-white px-5 py-3 font-display font-extrabold shadow-sticker transition hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
          >
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
