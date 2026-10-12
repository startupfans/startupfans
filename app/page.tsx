import { WaitlistForm } from "./waitlist-form";

interface ValueProp {
  emoji: string;
  title: string;
  body: string;
  colorClass: string;
  tiltClass: string;
}

interface Step {
  label: string;
  title: string;
  body: string;
  colorClass: string;
}

const VALUE_PROPS: ValueProp[] = [
  {
    emoji: "🔭",
    title: "Find them early",
    body: "Hand-picked new startups, before they hit your feed. The good stuff, minus the launch-day noise.",
    colorClass: "bg-sun",
    tiltClass: "md:-rotate-2",
  },
  {
    emoji: "🤫",
    title: "Get the inside scoop",
    body: "Behind-the-scenes updates straight from founders: what they're building, what's working, and what's coming next. The stuff that never makes the press release.",
    colorClass: "bg-sky",
    tiltClass: "md:rotate-2",
  },
  {
    emoji: "🎟️",
    title: "Get in first",
    body: "Early access and founding-fan pricing on products you actually want. First in line, every time.",
    colorClass: "bg-pink",
    tiltClass: "md:-rotate-1",
  },
  {
    emoji: "📣",
    title: "Shape what gets built",
    body: "Your feedback goes straight to the founders. Tell them what you'd pay for, then watch it ship.",
    colorClass: "bg-lime",
    tiltClass: "md:rotate-1",
  },
];

const STEPS: Step[] = [
  {
    label: "Step 1",
    title: "Join the fan club",
    body: "Tell us what you're into. It takes about thirty seconds.",
    colorClass: "bg-sky",
  },
  {
    label: "Step 2",
    title: "Get the inside track",
    body: "Insider updates on what founders are building, plus new startups before anyone else hears about them.",
    colorClass: "bg-tangerine",
  },
  {
    label: "Step 3",
    title: "Back what you love",
    body: "Grab early access, lock in founding-fan pricing, and tell founders what to build next.",
    colorClass: "bg-lime",
  },
];

const BARCODE_BARS = [2, 4, 1, 3, 2, 5, 1, 2, 4, 1, 3, 1, 5, 2, 1, 3, 4, 1, 2, 3];

const TICKER_WORDS = ["Find them early", "Get the inside scoop", "Get in first", "Be a fan", "Shape what ships"];

export default function Home() {
  return (
    <main className="overflow-x-clip">
      <Nav />
      <Hero />
      <Ticker />
      <ValueProps />
      <HowItWorks />
      <JoinSection />
      <Footer />
    </main>
  );
}

function Nav() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <a href="#" className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight">
        <Star className="size-7 text-sun" />
        startupfans
      </a>
      <a
        href="#join"
        className="rounded-full border-2 border-ink bg-white px-4 py-2 text-sm font-bold shadow-sticker transition hover:-translate-y-0.5 hover:bg-sun active:translate-y-0 active:shadow-none"
      >
        Become a fan
      </a>
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
        Get the{" "}
        <span className="relative inline-block whitespace-nowrap">
          <span className="relative z-10">inside track</span>
          <span aria-hidden className="absolute inset-x-0 bottom-1 -z-0 h-4 -rotate-1 rounded-sm bg-pink sm:h-6" />
        </span>{" "}
        on startups.
      </h1>

      <p className="mt-6 max-w-2xl text-lg text-pretty text-ink/80 sm:text-xl">
        Insider updates straight from founders on what they&apos;re building and what&apos;s shipping next, plus first
        access before anyone else.
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
          <li>⚡ First dibs on new startups</li>
          <li>🤫 Insider updates from founders</li>
          <li>💸 Founding-fan pricing</li>
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

function ValueProps() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
      <SectionHeading eyebrow="Why be a fan" title="The best seat in the house for what's next." />
      <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {VALUE_PROPS.map((prop) => (
          <article
            key={prop.title}
            className={`rounded-3xl border-[3px] border-ink p-7 shadow-sticker-lg transition hover:rotate-0 hover:-translate-y-1 ${prop.colorClass} ${prop.tiltClass}`}
          >
            <div className="flex size-14 items-center justify-center rounded-2xl border-[3px] border-ink bg-white text-3xl">
              {prop.emoji}
            </div>
            <h3 className="mt-6 font-display text-2xl font-extrabold tracking-tight">{prop.title}</h3>
            <p className="mt-3 text-ink/80">{prop.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-8 border-y-[3px] border-ink bg-ink py-24 text-cream">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading eyebrow="How it works" title="Three steps to front row." isDark />

        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.label} className="rounded-3xl border-[3px] border-cream/90 bg-ink p-7">
              <span
                className={`inline-block rounded-full border-2 border-ink px-3 py-1 font-mono text-xs font-bold tracking-wide text-ink uppercase ${step.colorClass}`}
              >
                {step.label}
              </span>
              <h3 className="mt-5 font-display text-3xl font-extrabold tracking-tight">{step.title}</h3>
              <p className="mt-3 text-cream/75">{step.body}</p>
            </li>
          ))}
        </ol>
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
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-5 pb-12 text-sm text-ink/70 sm:flex-row sm:items-center sm:px-8">
      <span className="flex items-center gap-2 font-display text-base font-extrabold text-ink">
        <Star className="size-5 text-sun" />
        startupfans
      </span>
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
