"use client";

import { useEffect, useState } from "react";

interface Stats {
  fans: number;
  startups: number;
  updates: number;
}

const POLL_MS = 30_000;

const METRICS = [
  { key: "fans" as const, label: "fans", colorClass: "bg-pink" },
  { key: "startups" as const, label: "startups", colorClass: "bg-sky" },
  { key: "updates" as const, label: "updates", colorClass: "bg-lime" },
];

function formatCount(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("en-GB");
}

function isStats(value: unknown): value is Stats {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.fans === "number" &&
    typeof row.startups === "number" &&
    typeof row.updates === "number"
  );
}

async function fetchStats(): Promise<Stats | null> {
  try {
    const response = await fetch("/api/stats", { cache: "no-store" });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    return isStats(data) ? data : null;
  } catch {
    return null;
  }
}

export function PlatformStats({
  initial,
  variant = "landing",
}: {
  initial?: Stats;
  variant?: "landing" | "feed";
}) {
  const [stats, setStats] = useState<Stats | null>(initial ?? null);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;

    const load = async () => {
      const next = await fetchStats();
      if (active && next) setStats(next);
    };

    const schedule = () => {
      window.clearTimeout(timer);
      if (document.hidden) return;
      timer = window.setTimeout(async () => {
        await load();
        if (active) schedule();
      }, POLL_MS);
    };

    const onVisibility = () => {
      if (document.hidden) {
        window.clearTimeout(timer);
        return;
      }
      void load().then(() => {
        if (active) schedule();
      });
    };

    void load().then(() => {
      if (active) schedule();
    });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const isLanding = variant === "landing";
  const fans = stats?.fans ?? null;
  const startups = stats?.startups ?? null;
  const updates = stats?.updates ?? null;
  const values = { fans, startups, updates };

  return (
    <section
      aria-label="Platform totals"
      className={
        isLanding
          ? "mx-auto max-w-6xl px-5 pb-4 sm:px-8 sm:pb-6"
          : "mb-6"
      }
    >
      <div
        className={
          isLanding
            ? "rounded-3xl border-[3px] border-ink bg-white p-4 shadow-sticker sm:p-5"
            : "rounded-2xl border-[3px] border-ink bg-white p-3 shadow-sticker"
        }
      >
        <div className="mb-3 flex items-center gap-2 sm:mb-4">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-pink opacity-75 motion-reduce:hidden" />
            <span className="relative inline-flex size-2.5 rounded-full bg-pink" />
          </span>
          <p className="font-mono text-[10px] font-bold tracking-widest text-ink/70 uppercase sm:text-xs">
            Live on StartupFans
          </p>
        </div>

        <dl
          className={
            isLanding
              ? "grid grid-cols-3 gap-2 sm:gap-4"
              : "grid grid-cols-3 gap-2"
          }
        >
          {METRICS.map((metric) => (
            <div
              key={metric.key}
              className={`min-w-0 rounded-2xl border-[3px] border-ink ${metric.colorClass} ${
                isLanding ? "px-2 py-3 sm:px-4 sm:py-4" : "px-2 py-2.5"
              }`}
            >
              <dt className="font-mono text-[10px] font-bold tracking-widest uppercase sm:text-xs">
                {metric.label}
              </dt>
              <dd
                className={`mt-1 font-display font-extrabold tabular-nums leading-none ${
                  isLanding
                    ? "text-2xl sm:text-4xl lg:text-5xl"
                    : "text-xl sm:text-2xl"
                }`}
              >
                {formatCount(values[metric.key])}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
