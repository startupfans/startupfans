import type { Metadata } from "next";
import Image from "next/image";
import { SessionLink } from "./components/session-link";
import { WaitlistForm } from "./waitlist-form";

export const dynamic = "force-static";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const LOGO_WIDTH = 910;
const LOGO_HEIGHT = 150;

interface ValueProp {
  emoji: string;
  title: string;
  body: string;
  colorClass: string;
  tiltClass: string;
}

const FAN_PROPS: ValueProp[] = [
  {
    emoji: "🤫",
    title: "Get the inside scoop",
    body: "Exclusive posts straight from the team: what they're working on today, what they just shipped, and the photos from the team dinner.",
    colorClass: "bg-sky",
    tiltClass: "md:-rotate-2",
  },
  {
    emoji: "🚢",
    title: "See what's shipping",
    body: "Watch features land as they ship, posted by the people who built them. Before it's a press release, and sometimes instead of one.",
    colorClass: "bg-pink",
    tiltClass: "md:rotate-1",
  },
  {
    emoji: "💌",
    title: "Free for fans",
    body: "Follow every startup you care about in one feed, for free, with no algorithm burying the good stuff.",
    colorClass: "bg-lime",
    tiltClass: "md:-rotate-1",
  },
];

const STARTUP_PROPS: ValueProp[] = [
  {
    emoji: "📣",
    title: "Marketing that writes itself",
    body: "Your team already makes great content every day. Give it somewhere to live: a steady stream of real posts from the people building the product.",
    colorClass: "bg-sun",
    tiltClass: "md:rotate-1",
  },
  {
    emoji: "🤝",
    title: "Show prospects you ship",
    body: "Prospects and customers see what you're shipping, as you ship it. A better link to send than another case study.",
    colorClass: "bg-tangerine",
    tiltClass: "md:-rotate-2",
  },
  {
    emoji: "🧲",
    title: "Hire people who get you",
    body: "Candidates see the real team and what it's like to work with you before they apply. Way better than a stock-photo careers page.",
    colorClass: "bg-pink",
    tiltClass: "md:rotate-2",
  },
];

const BARCODE_BARS = [2, 4, 1, 3, 2, 5, 1, 2, 4, 1, 3, 1, 5, 2, 1, 3, 4, 1, 2, 3];

const TICKER_WORDS = ["Get the inside scoop", "See what's shipping", "Follow for free", "Open the kitchen", "Be a fan"];

export default function Home() {
  return (
    <main className="overflow-x-clip">
      <Nav />
      <Hero />
      <Ticker />
      <AudienceSection
        id="fans"
        eyebrow="For fans"
        title="The best seat in the house for what's next."
        props={FAN_PROPS}
      />
      <AudienceSection
        id="startups"
        eyebrow="For startups"
        title="Your #wins channel deserves an audience."
        props={STARTUP_PROPS}
        isDark
      />
      <JoinSection />
      <Footer />
    </main>
  );
}

function Nav() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8">
      <a href="#" className="min-w-0">
        <Image
          src="/logo/startupfans-logo-on-light.svg"
          alt="StartupFans"
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          loading="eager"
          className="h-auto w-24 sm:w-36 md:h-9 md:w-auto"
        />
      </a>
      <nav className="flex shrink-0 items-center gap-3 whitespace-nowrap sm:gap-5">
        <a href="#fans" className="hidden font-bold hover:text-pink sm:inline">
          For fans
        </a>
        <a href="#startups" className="hidden font-bold hover:text-pink sm:inline">
          For startups
        </a>
        <SessionLink
          showAdmin
          signedOut={{ href: "/login", label: "Sign in", className: "min-h-11 text-sm font-bold hover:text-pink sm:text-base" }}
          signedIn={{ href: "/feed", label: "Your feed", className: "min-h-11 text-sm font-bold hover:text-pink sm:text-base" }}
        />
        <a
          href="#join"
          className="rounded-full border-2 border-ink bg-white px-3 py-2 text-sm font-bold shadow-sticker transition hover:-translate-y-0.5 hover:bg-sun active:translate-y-0 active:shadow-none sm:px-4"
        >
          <span className="sm:hidden">Join</span>
          <span className="hidden sm:inline">Join the waitlist</span>
        </a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-16 px-5 pt-10 pb-20 sm:px-8 sm:pt-16 sm:pb-28 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <HeroCopy />
      </div>
      <FanCard />
    </section>
  );
}

function HeroCopy() {
  return (
    <>
      <div className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-white px-3 py-1 font-mono text-xs font-semibold tracking-wide uppercase shadow-sticker">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-pink opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-pink" />
        </span>
        Now accepting early fans
      </div>

      <h1 className="mt-8 max-w-4xl font-display text-5xl leading-[0.95] font-extrabold tracking-tight text-balance sm:text-7xl lg:text-[5.25rem]">
        Get the inside track on startups.
      </h1>

      <div aria-hidden className="mt-8 h-3 w-28 -rotate-2 rounded-full border-2 border-ink bg-pink sm:h-4 sm:w-40" />

      <p className="mt-8 max-w-2xl text-lg text-pretty text-ink/80 sm:text-xl">
        Every startup has a #wins channel nobody outside ever sees. StartupFans gives it one public feed, posted by
        the whole team. Follow along for free.
      </p>

      <WaitlistForm />
    </>
  );
}

function FanCard() {
  return (
    <div className="relative mx-auto w-full max-w-sm lg:mx-0 lg:justify-self-end">
      <Sticker className="absolute -top-6 -left-4 animate-wobble bg-lime [--tilt:-10deg]">fan since day one</Sticker>
      <Sticker className="absolute -right-3 -bottom-5 animate-wobble bg-sky [--tilt:8deg]">early &gt; everyone</Sticker>

      <div className="rotate-3 rounded-3xl border-[3px] border-ink bg-sun p-6 shadow-sticker-lg transition hover:rotate-0">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-bold tracking-widest uppercase">Official fan club</span>
          <Star className="size-9 text-pink" />
        </div>
        <p className="mt-6 font-mono text-xs font-semibold tracking-wide text-ink/60 uppercase">Member no.</p>
        <p className="font-display text-7xl leading-none font-extrabold tabular-nums">#0001</p>
        <p className="mt-2 font-display text-lg font-bold">Could be you.</p>

        <ul className="mt-6 space-y-2 rounded-2xl border-2 border-ink bg-white p-4 text-sm font-semibold">
          <li>🤫 The inside scoop</li>
          <li>🚢 What&apos;s shipping, as it ships</li>
          <li>💌 Free to follow</li>
        </ul>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div aria-hidden className="flex h-10 flex-1 items-end gap-[3px]">
            {BARCODE_BARS.map((width, index) => (
              <span key={index} className="h-full bg-ink" style={{ width }} />
            ))}
          </div>
          <span className="font-mono text-[10px] font-bold tracking-wide uppercase">Early access</span>
        </div>
      </div>
    </div>
  );
}

function Ticker() {
  const words = [...TICKER_WORDS, ...TICKER_WORDS];

  return (
    <div className="-rotate-1 border-y-[3px] border-ink bg-sun py-3" aria-hidden>
      <div className="flex w-max animate-marquee">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0">
            {words.map((word, index) => (
              <span
                key={`${copy}-${index}`}
                className="flex items-center gap-6 px-6 font-display text-2xl font-extrabold uppercase sm:text-3xl"
              >
                {word}
                <Star className="size-6 text-pink" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function AudienceSection({
  id,
  eyebrow,
  title,
  props,
  isDark = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  props: ValueProp[];
  isDark?: boolean;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-8 py-24 ${isDark ? "border-y-[3px] border-ink bg-ink text-cream" : ""}`}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading eyebrow={eyebrow} title={title} isDark={isDark} />
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {props.map((prop) => (
            <article
              key={prop.title}
              className={`rounded-3xl border-[3px] border-ink p-7 text-ink transition hover:rotate-0 hover:-translate-y-1 ${isDark ? "shadow-[8px_8px_0_0_var(--color-cream)]" : "shadow-sticker-lg"} ${prop.colorClass} ${prop.tiltClass}`}
            >
              <div className="flex size-14 items-center justify-center rounded-2xl border-[3px] border-ink bg-white text-3xl">
                {prop.emoji}
              </div>
              <h3 className="mt-6 font-display text-2xl font-extrabold tracking-tight">{prop.title}</h3>
              <p className="mt-3 text-ink/80">{prop.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function JoinSection() {
  return (
    <section id="join" className="mx-auto max-w-6xl scroll-mt-8 px-5 py-24 sm:px-8">
      <div className="relative overflow-hidden rounded-[2rem] border-[3px] border-ink bg-pink p-8 shadow-sticker-lg sm:p-14">
        <Star className="absolute -top-10 -right-10 size-48 rotate-12 text-sun opacity-90" />
        <div className="relative max-w-2xl">
          <p className="font-mono text-xs font-bold tracking-widest uppercase">The fan list</p>
          <h2 className="mt-3 font-display text-4xl leading-none font-extrabold tracking-tight text-balance sm:text-6xl">
            Get in before everyone else.
          </h2>
          <p className="mt-5 text-lg text-ink/80">
            Fans hear about new startups first, get founding-fan pricing, and get a direct line to the people building
            them.
          </p>
        </div>

        <WaitlistForm />
        <p className="mt-4 text-sm text-ink">
          <SessionLink
            signedOut={{
              href: "/login",
              label: <>Already have access? <span className="font-bold underline underline-offset-4">Sign in</span>.</>,
            }}
            signedIn={{
              href: "/feed",
              label: <>You&apos;re signed in. <span className="font-bold underline underline-offset-4">Go to your feed</span>.</>,
            }}
          />
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-5 pb-12 text-sm text-ink/70 sm:flex-row sm:items-center sm:px-8">
      <Image
        src="/logo/startupfans-logo-on-light.svg"
        alt="StartupFans"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        className="h-6 w-auto"
      />
      <span>For people who like things early. © {new Date().getFullYear()}</span>
    </footer>
  );
}

function SectionHeading({ eyebrow, title, isDark = false }: { eyebrow: string; title: string; isDark?: boolean }) {
  return (
    <div className="max-w-3xl">
      <p className={`font-mono text-xs font-bold tracking-widest uppercase ${isDark ? "text-sun" : "text-pink"}`}>
        {eyebrow}
      </p>
      <h2 className="mt-3 font-display text-4xl leading-[1.02] font-extrabold tracking-tight text-balance sm:text-5xl">
        {title}
      </h2>
    </div>
  );
}

function Sticker({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`z-10 rounded-xl border-[3px] border-ink px-4 py-2 font-display text-sm font-extrabold uppercase shadow-sticker ${className}`}
    >
      {children}
    </span>
  );
}

function Star({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <path
        d="M32 6l7.6 16.6 18.1 2-13.5 12.2 3.8 17.9L32 45.6l-16 9.1 3.8-17.9L6.3 24.6l18.1-2z"
        fill="currentColor"
        stroke="var(--color-ink)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
