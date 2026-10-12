import Link from "next/link";
import { Sticker } from "@/app/components/sticker";
import { StartupForm } from "@/app/s/[slug]/follow-button";
import { requireUser } from "@/lib/auth";

const inputClass = "mt-2 min-h-11 w-full min-w-0 rounded-xl border-2 border-ink bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink";

async function StartPage() {
  await requireUser("/start");

  return (
    <main className="mx-auto min-h-screen min-w-0 max-w-2xl break-words px-5 py-10 sm:py-16">
      <Link href="/" className="inline-flex min-h-11 items-center py-2 font-display text-xl font-extrabold tracking-tight">startupfans</Link>
      <section className="mt-10 rounded-3xl border-[3px] border-ink bg-cream p-6 shadow-sticker-lg sm:p-10">
        <Sticker className="inline-block -rotate-3 bg-lime">Your startup, inside out</Sticker>
        <h1 className="mt-8 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Start your fan club.</h1>
        <p className="mt-4 text-lg text-ink/80">Give your team a place to share. Your page is public and free.</p>
        <StartupForm>
          <label htmlFor="name" className="block font-bold">Startup name
            <input id="name" name="name" required minLength={2} maxLength={60} autoComplete="organization" className={inputClass} />
          </label>
          <label htmlFor="slug" className="block font-bold">Page address
            <span id="slug-help" className="mt-1 block text-sm font-normal text-ink/70">startupfans.co/s/your-name</span>
            <input id="slug" name="slug" required minLength={3} maxLength={40} pattern="[a-z0-9][a-z0-9\-]{1,38}[a-z0-9]" aria-describedby="slug-help" autoCapitalize="none" autoCorrect="off" spellCheck={false} className={inputClass} />
          </label>
          <label htmlFor="tagline" className="block font-bold">Tagline <span className="font-normal">(optional)</span>
            <input id="tagline" name="tagline" maxLength={120} className={inputClass} />
          </label>
          <label htmlFor="description" className="block font-bold">Description <span className="font-normal">(optional)</span>
            <textarea id="description" name="description" maxLength={2000} rows={5} className={`${inputClass} resize-y`} />
          </label>
          <label htmlFor="logoUrl" className="block font-bold">Logo URL <span className="font-normal">(optional)</span>
            <input id="logoUrl" name="logoUrl" type="url" pattern="https://.*" maxLength={500} placeholder="https://" className={inputClass} />
          </label>
          <label htmlFor="website" className="block font-bold">Website <span className="font-normal">(optional)</span>
            <input id="website" name="website" type="url" pattern="https://.*" maxLength={500} placeholder="https://" autoComplete="url" className={inputClass} />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label htmlFor="stage" className="block font-bold">Stage <span className="font-normal">(optional)</span>
              <select id="stage" name="stage" defaultValue="" className={inputClass}>
                <option value="">Choose a stage</option>
                <option value="idea">Idea</option>
                <option value="pre-seed">Pre-seed</option>
                <option value="seed">Seed</option>
                <option value="series-a">Series A</option>
                <option value="growth">Growth</option>
                <option value="bootstrapped">Bootstrapped</option>
              </select>
            </label>
            <label htmlFor="teamSize" className="block font-bold">Team size <span className="font-normal">(optional)</span>
              <input id="teamSize" name="teamSize" type="number" min={1} max={10000} step={1} className={inputClass} />
            </label>
          </div>
        </StartupForm>
      </section>
    </main>
  );
}

export { StartPage as default };
