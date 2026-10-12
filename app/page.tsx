interface ValueProp {
  emoji: string;
  title: string;
  body: string;
  colorClass: string;
  tiltClass: string;
}

interface DayPlan {
  day: string;
  title: string;
  body: string;
  colorClass: string;
}

interface ScoreStat {
  label: string;
  value: string;
}

const VALUE_PROPS: ValueProp[] = [
  {
    emoji: "📺",
    title: "Watch it get built, live",
    body: "Every idea, pivot and 2am bug, posted as it happens. No polish, no launch-video spin. Just a team trying to make real money in three days.",
    colorClass: "bg-sun",
    tiltClass: "md:-rotate-2",
  },
  {
    emoji: "🎟️",
    title: "Be customer #1",
    body: "Fans get first access, and the founders' price, on everything we ship. Real products, real receipts, and bragging rights forever.",
    colorClass: "bg-pink",
    tiltClass: "md:rotate-1",
  },
  {
    emoji: "📣",
    title: "Help pick what we build",
    body: "The idea board is stacked. Tell us what you'd actually pay for, roast what we launch, and watch your feedback ship by the next morning.",
    colorClass: "bg-lime",
    tiltClass: "md:-rotate-1",
  },
];

const DAY_PLANS: DayPlan[] = [
  {
    day: "Day 1",
    title: "Pick & build",
    body: "Narrow the idea board to the few that can charge money this week. Then build like the clock's on fire.",
    colorClass: "bg-sky",
  },
  {
    day: "Day 2",
    title: "Launch",
    body: "Live URLs, real checkouts, and posts everywhere. If it isn't public, it doesn't count.",
    colorClass: "bg-tangerine",
  },
  {
    day: "Day 3",
    title: "Get paid",
    body: "Sell, iterate, sell again. Paying customers are the gold standard. Everything else is vibes.",
    colorClass: "bg-lime",
  },
];

const SCOREBOARD: ScoreStat[] = [
  { label: "Startups launched", value: "0" },
  { label: "Paying fans", value: "0" },
  { label: "Revenue", value: "£0" },
];

const BARCODE_BARS = [2, 4, 1, 3, 2, 5, 1, 2, 4, 1, 3, 1, 5, 2, 1, 3, 4, 1, 2, 3];

const TICKER_WORDS = ["Ship it", "Get paid", "Be a fan", "72 hours", "No sleep", "Revenue or bust"];

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
        Launchathon · 3 days · 1 offsite
      </div>

      <h1 className="mt-8 max-w-4xl font-display text-5xl leading-[0.95] font-extrabold tracking-tight text-balance sm:text-7xl lg:text-[5.25rem]">
        Real startups, launched in{" "}
        <span className="relative inline-block whitespace-nowrap">
          <span className="relative z-10">72 hours.</span>
          <span aria-hidden className="absolute inset-x-0 bottom-1 -z-0 h-4 -rotate-1 rounded-sm bg-pink sm:h-6" />
        </span>
      </h1>

      <p className="mt-6 max-w-2xl text-lg text-pretty text-ink/80 sm:text-xl">
        A small team, one offsite, and a single rule: ship something real and get paid for it by the end of day three.
        Follow along, pick what we build, and be the first fan through the door.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <a
          href="#join"
          className="rounded-2xl border-[3px] border-ink bg-pink px-7 py-4 font-display text-lg font-extrabold shadow-sticker-lg transition hover:-translate-y-1 active:translate-y-0.5 active:shadow-sticker"
        >
          Become a fan →
        </a>
        <a href="#how" className="px-2 py-4 font-bold underline decoration-2 underline-offset-4 hover:text-pink">
          How it works
        </a>
      </div>
    </>
  );
}

function FanCard() {
  return (
    <div className="relative mx-auto w-full max-w-sm lg:mx-0 lg:justify-self-end">
      <Sticker className="absolute -top-6 -left-4 animate-wobble bg-lime [--tilt:-10deg]">made on zero sleep</Sticker>
      <Sticker className="absolute -right-3 -bottom-5 animate-wobble bg-sky [--tilt:8deg]">revenue or bust</Sticker>

      <div className="rotate-3 rounded-3xl border-[3px] border-ink bg-sun p-6 shadow-sticker-lg transition hover:rotate-0">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-bold tracking-widest uppercase">Official fan club</span>
          <Star className="size-9 text-pink" />
        </div>
        <p className="mt-6 font-mono text-xs font-semibold tracking-wide text-ink/60 uppercase">Member no.</p>
        <p className="font-display text-7xl leading-none font-extrabold tabular-nums">#0001</p>
        <p className="mt-2 font-display text-lg font-bold">Could be you.</p>

        <ul className="mt-6 space-y-2 rounded-2xl border-2 border-ink bg-white p-4 text-sm font-semibold">
          <li>⚡ First dibs on every launch</li>
          <li>💸 Founders&apos; pricing</li>
          <li>🗳️ A say in what we build</li>
        </ul>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div aria-hidden className="flex h-10 flex-1 items-end gap-[3px]">
            {BARCODE_BARS.map((width, index) => (
              <span key={index} className="h-full bg-ink" style={{ width }} />
            ))}
          </div>
          <span className="font-mono text-[10px] font-bold tracking-wide uppercase">Valid 72h</span>
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
      <SectionHeading eyebrow="Why be a fan" title="Front-row seats to a very fast, very public experiment." />
      <div className="mt-14 grid gap-8 md:grid-cols-3">
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
        <SectionHeading eyebrow="The plan" title="Three days. No excuses." isDark />

        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {DAY_PLANS.map((plan) => (
            <li key={plan.day} className="rounded-3xl border-[3px] border-cream/90 bg-ink p-7">
              <span
                className={`inline-block rounded-full border-2 border-ink px-3 py-1 font-mono text-xs font-bold tracking-wide text-ink uppercase ${plan.colorClass}`}
              >
                {plan.day}
              </span>
              <h3 className="mt-5 font-display text-3xl font-extrabold tracking-tight">{plan.title}</h3>
              <p className="mt-3 text-cream/75">{plan.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-16 rounded-3xl border-[3px] border-ink bg-cream p-6 text-ink shadow-[8px_8px_0_0_var(--color-pink)] sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-2xl font-extrabold tracking-tight">Live scoreboard</h3>
            <span className="font-mono text-xs font-semibold tracking-wide text-ink/60 uppercase">
              Updated live-ish
            </span>
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            {SCOREBOARD.map((stat) => (
              <div key={stat.label} className="rounded-2xl border-2 border-ink bg-white p-5">
                <dt className="font-mono text-xs font-semibold tracking-wide text-ink/60 uppercase">{stat.label}</dt>
                <dd className="mt-2 font-display text-5xl font-extrabold tabular-nums">{stat.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-sm text-ink/70">Zero for now. Help us change that.</p>
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
            Get in before the doors open.
          </h2>
          <p className="mt-5 text-lg text-ink/80">
            Fans hear about every launch first, get early-bird pricing, and help decide what we build next. Sign-ups
            open very soon.
          </p>
        </div>

        {/* Sign-up form goes here. */}
        <div className="relative mt-10 flex max-w-xl flex-col gap-3 rounded-2xl border-[3px] border-dashed border-ink bg-white/70 p-5 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-bold">The fan list opens soon.</span>
          <span className="w-fit rounded-full border-2 border-ink bg-sun px-3 py-1 font-mono text-xs font-bold tracking-wide uppercase">
            Coming soon
          </span>
        </div>
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
      <span>Built in public, at an offsite, on too much coffee. © {new Date().getFullYear()}</span>
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
