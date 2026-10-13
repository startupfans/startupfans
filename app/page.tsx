import type { Metadata } from "next";
import Image from "next/image";
import { SessionLink } from "./components/session-link";

export const dynamic = "force-static";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const LOGO_WIDTH = 910;
const LOGO_HEIGHT = 150;

const signupCtaClass =
  "mt-10 inline-flex min-h-11 items-center justify-center rounded-2xl border-[3px] border-ink bg-pink px-7 py-4 font-display text-lg font-extrabold shadow-sticker transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none";

interface ValueProp {
  emoji: string;
  title: string;
  body: string;
  colorClass: string;
  tiltClass: string;
}

const STARTUP_PROPS: ValueProp[] = [
  {
    emoji: "📣",
    title: "Get in front of fans",
    body: "One place for people who actually want the inside track on your team. Free to join.",
    colorClass: "bg-sun",
    tiltClass: "md:rotate-1",
  },
  {
    emoji: "🚢",
    title: "Show what you're shipping",
    body: "One feed for the team: what you're working on, what just shipped, the real stuff prospects and candidates never see.",
    colorClass: "bg-tangerine",
    tiltClass: "md:-rotate-2",
  },
  {
    emoji: "🧲",
    title: "Hire people who get you",
    body: "Candidates see the real team before they apply. Way better than a stock-photo careers page.",
    colorClass: "bg-pink",
    tiltClass: "md:rotate-2",
  },
];

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

const BARCODE_BARS = [2, 4, 1, 3, 2, 5, 1, 2, 4, 1, 3, 1, 5, 2, 1, 3, 4, 1, 2, 3];

const TICKER_WORDS = [
  "Early startups",
  "Free to join",
  "Team feeds",
  "Launching today",
  "Straight from the team",
];

export default function Home() {
  return (
    <main className="overflow-x-clip">
      <Nav />
      <Hero />
      <Ticker />
      <AudienceSection
        id="startups"
        eyebrow="For startups"
        title="One feed. Your whole team. Fans who care."
        props={STARTUP_PROPS}
        isDark
      />
      <AudienceSection
        id="fans"
        eyebrow="For fans"
        title="The best seat in the house for what's next."
        props={FAN_PROPS}
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
        <a href="#startups" className="hidden font-bold hover:text-pink sm:inline">
          For startups
        </a>
        <a href="#fans" className="hidden font-bold hover:text-pink sm:inline">
          For fans
        </a>
        <SessionLink
          signedOut={{ href: "/login", label: "Sign in", className: "min-h-11 text-sm font-bold hover:text-pink sm:text-base" }}
          signedIn={{ href: "/feed", label: "Your feed", className: "min-h-11 text-sm font-bold hover:text-pink sm:text-base" }}
        />
        <SessionLink
          showAdmin
          signedOut={{
            href: "/login",
            label: "Sign up",
            className: "min-h-11 rounded-full border-2 border-ink bg-white px-3 py-2 text-sm font-bold shadow-sticker transition hover:-translate-y-0.5 hover:bg-sun active:translate-y-0 active:shadow-none sm:px-4",
          }}
          signedIn={{
            href: "/start",
            label: <><span className="sm:hidden">Start<span className="sr-only"> a startup</span></span><span className="hidden sm:inline">Start a startup</span></>,
            className: "min-h-11 rounded-full border-2 border-ink bg-pink px-3 py-2 text-sm font-bold shadow-sticker transition hover:-translate-y-0.5 active:translate-y-0 active:shadow-none sm:px-4",
          }}
        />
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
        Launching today · free to join
      </div>

      <h1 className="mt-8 max-w-4xl font-display text-5xl leading-[0.95] font-extrabold tracking-tight text-balance sm:text-7xl lg:text-[5.25rem]">
        Get your startup in front of fans.
      </h1>

      <div aria-hidden className="mt-8 h-3 w-28 -rotate-2 rounded-full border-2 border-ink bg-pink sm:h-4 sm:w-40" />

      <p className="mt-8 max-w-2xl text-lg text-pretty text-ink/80 sm:text-xl">
        StartupFans is where early startups post what they&apos;re shipping. One feed for the team, free for everyone.
        Sign up, create your page, and start posting.
      </p>

      <SessionLink
        signedOut={{
          href: "/login",
          label: "Sign up",
          className: signupCtaClass,
        }}
        signedIn={{
          href: "/start",
          label: "Start a startup",
          className: signupCtaClass,
        }}
      />

      <p className="mt-2 max-w-xl text-sm font-semibold text-ink/60">
        just here as a fan?{" "}
        <a href="/login" className="underline decoration-2 underline-offset-2 hover:text-pink">
          sign up
        </a>
        {" "}and follow along.
      </p>
    </>
  );
}

function FanCard() {
  return (
    <div className="relative mx-auto w-full max-w-sm lg:mx-0 lg:justify-self-end">
      <Sticker className="absolute -top-6 -left-4 animate-wobble bg-lime [--tilt:-10deg]">free to join</Sticker>
      <Sticker className="absolute -right-3 -bottom-5 animate-wobble bg-sky [--tilt:8deg]">launching today</Sticker>

      <div className="rotate-3 rounded-3xl border-[3px] border-ink bg-sun p-6 shadow-sticker-lg transition hover:rotate-0">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-bold tracking-widest uppercase">Your startup</span>
          <Star className="size-9 text-pink" />
        </div>
        <p className="mt-6 font-mono text-xs font-semibold tracking-wide text-ink/60 uppercase">Fan no.</p>
        <p className="font-display text-7xl leading-none font-extrabold tabular-nums">#0001</p>
        <p className="mt-2 font-display text-lg font-bold">Your first fan.</p>

        <ul className="mt-6 space-y-2 rounded-2xl border-2 border-ink bg-white p-4 text-sm font-semibold">
          <li>📣 Get in front of fans</li>
          <li>🚢 Show what you&apos;re shipping</li>
          <li>💌 Free for startups &amp; fans</li>
        </ul>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div aria-hidden className="flex h-10 flex-1 items-end gap-[3px]">
            {BARCODE_BARS.map((width, index) => (
              <span key={index} className="h-full bg-ink" style={{ width }} />
            ))}
          </div>
          <span className="font-mono text-[10px] font-bold tracking-wide uppercase">Sign up today</span>
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
          <p className="font-mono text-xs font-bold tracking-widest uppercase">Launching today</p>
          <h2 className="mt-3 font-display text-4xl leading-none font-extrabold tracking-tight text-balance sm:text-6xl">
            Start your startup page.
          </h2>
          <p className="mt-5 text-lg text-ink/80">
            sign up with your email, create a page, and post what you&apos;re shipping. fans welcome too.
          </p>
        </div>

        <SessionLink
          signedOut={{
            href: "/login",
            label: "Sign up →",
            className: "mt-8 inline-flex min-h-11 items-center justify-center rounded-2xl border-[3px] border-ink bg-white px-7 py-4 font-display text-lg font-extrabold shadow-sticker transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none",
          }}
          signedIn={{
            href: "/start",
            label: "Start a startup →",
            className: "mt-8 inline-flex min-h-11 items-center justify-center rounded-2xl border-[3px] border-ink bg-white px-7 py-4 font-display text-lg font-extrabold shadow-sticker transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none",
          }}
        />
        <p className="mt-4 text-sm text-ink">
          <SessionLink
            signedOut={{
              href: "/login",
              label: <>Already have an account? <span className="font-bold underline underline-offset-4">Sign in</span>.</>,
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
