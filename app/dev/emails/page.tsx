import Link from "next/link";
import { notFound } from "next/navigation";

function EmailPreviewsPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto min-h-screen min-w-0 max-w-xl break-words px-5 py-10 sm:py-20">
      <Link href="/" className="inline-flex min-h-11 items-center py-2 font-display text-xl font-extrabold">startupfans</Link>
      <section className="mt-10 rounded-3xl border-[3px] border-ink bg-cream p-6 shadow-sticker-lg sm:p-10">
        <span className="inline-block rounded-xl border-2 border-ink bg-lime px-4 py-1 text-xs font-bold uppercase">Dev only</span>
        <h1 className="mt-8 font-display text-4xl font-extrabold">Email previews.</h1>
        <p className="mt-5">Sample links only. These previews don&apos;t send an email.</p>
        <p className="mt-3 text-sm">Gmail, Apple Mail, Yahoo and Outlook.com get rounded cards, badges, buttons and link boxes. Outlook desktop uses a rounded VML button; the card, badge and link box keep square borders and the hard offset shadow.</p>
        <ul className="mt-6 space-y-5">
          {[
            { name: "magic-link", label: "Sign-in magic link" },
            { name: "sign-in-code", label: "Six-digit sign-in code" },
            { name: "invite", label: "Team invite" },
            ...["mention", "reply", "new-fan", "reshare", "team-joined"].map((name) => ({ name, label: name.replaceAll("-", " ") })),
          ].map(({ name, label }) => (
            <li key={name} className="rounded-xl border-2 border-ink bg-white p-4">
              <p className="font-bold">{label}</p>
              <div className="mt-2 flex flex-wrap gap-x-5">
                <a href={`/dev/emails/${name}`} className="inline-flex min-h-11 items-center py-2 font-bold underline underline-offset-4">HTML preview</a>
                <a href={`/dev/emails/${name}?text=1`} className="inline-flex min-h-11 items-center py-2 underline underline-offset-4">Plain text</a>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export { EmailPreviewsPage as default };
