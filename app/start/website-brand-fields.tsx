"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ImageUpload } from "@/app/s/[slug]/settings/image-upload";

const inputClass = "mt-2 min-h-11 w-full min-w-0 rounded-xl border-2 border-ink bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink";
const chipClass = "min-h-11 rounded-xl border-2 border-ink bg-white px-4 py-2 font-bold shadow-sticker disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink";

type LogoCandidate = {
  url: string;
  source: "apple-touch-icon" | "og-image" | "icon" | "favicon" | "favicon-proxy";
};

type LookupResult = {
  website: string;
  host: string;
  logos: LogoCandidate[];
};

function displayHost(website: string) {
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return website;
  }
}

export function WebsiteBrandFields({ creatorId }: { creatorId: string }) {
  const websiteId = useId();
  const { pending } = useFormStatus();
  const [website, setWebsite] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [dismissedFor, setDismissedFor] = useState("");
  const [logoSeed, setLogoSeed] = useState({ key: 0, url: "" });
  const [brokenLogos, setBrokenLogos] = useState<Set<string>>(() => new Set());
  const lastQueried = useRef("");
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const visibleLogos = lookup?.logos.filter((logo) => !brokenLogos.has(logo.url)) ?? [];
  const activeLogo = selectedLogo && !brokenLogos.has(selectedLogo)
    ? selectedLogo
    : visibleLogos[0]?.url ?? null;
  const showSuggestion = Boolean(lookup && activeLogo);

  async function lookupWebsite(value: string) {
    const trimmed = value.trim();
    if (!trimmed || trimmed === lastQueried.current || trimmed === dismissedFor) return;
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setLookingUp(true);
    setError("");
    try {
      const response = await fetch(`/api/brand-lookup?website=${encodeURIComponent(trimmed)}`, {
        cache: "no-store",
        signal: active.signal,
      });
      if (active.signal.aborted) return;
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string } | null;
        setLookup(null);
        setSelectedLogo(null);
        if (response.status !== 400) setError(payload?.message ?? "We couldn't look that website up.");
        return;
      }
      const result = await response.json() as LookupResult;
      if (active.signal.aborted) return;
      lastQueried.current = trimmed;
      setBrokenLogos(new Set());
      setLookup(result);
      setSelectedLogo(result.logos[0]?.url ?? null);
    } catch (cause) {
      if (!active.signal.aborted && !(cause instanceof DOMException && cause.name === "AbortError")) {
        setError("We couldn't look that website up.");
        setLookup(null);
        setSelectedLogo(null);
      }
    } finally {
      if (controller.current === active) {
        controller.current = null;
        setLookingUp(false);
      }
    }
  }

  async function applyPrefill() {
    if (!lookup || !activeLogo) return;
    setImporting(true);
    setError("");
    setWebsite(lookup.website);
    let logoUrl = activeLogo;
    const form = document.getElementById(websiteId)?.closest("form");
    const slugInput = form?.elements.namedItem("slug");
    const slug = slugInput instanceof HTMLInputElement ? slugInput.value.trim() : "";
    if (slug) {
      try {
        const response = await fetch("/api/brand-lookup/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: activeLogo, slug }),
        });
        if (response.ok) {
          const payload = await response.json() as { url?: string };
          if (payload.url) logoUrl = payload.url;
        }
      } catch {
        // Keep the remote logo URL if the copy fails.
      }
    }
    setLogoSeed((current) => ({ key: current.key + 1, url: logoUrl }));
    setDismissedFor(lookup.website);
    lastQueried.current = lookup.website;
    setLookup(null);
    setSelectedLogo(null);
    setImporting(false);
  }

  return (
    <>
      <div>
        <label htmlFor={websiteId} className="block font-bold">Website <span className="font-normal">(optional)</span>
          <input id={websiteId} name="website" type="text" inputMode="url" maxLength={500}
            placeholder="yourstartup.com" autoComplete="url" value={website} disabled={pending}
            className={inputClass}
            onChange={(event) => {
              const value = event.target.value;
              setWebsite(value);
              setError("");
              if (value.trim() !== dismissedFor) setDismissedFor("");
            }}
            onBlur={() => void lookupWebsite(website)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void lookupWebsite(website);
              }
            }} />
        </label>
        <p className="mt-1 text-sm text-ink/70">
          {lookingUp ? "Looking up logo…" : "We'll offer a website and logo if we find them."}
        </p>
        {error && <p role="alert" className="mt-2 text-sm font-semibold">{error}</p>}
      </div>

      {showSuggestion && lookup && activeLogo && (
        <div className="rounded-3xl border-[3px] border-ink bg-sky/40 p-4 shadow-sticker sm:p-5">
          <p className="font-display text-lg font-extrabold">Use these for {displayHost(lookup.website)}?</p>
          <p className="mt-1 break-all text-sm text-ink/80">{lookup.website}</p>
          <div className="mt-4 flex flex-wrap gap-3" role="listbox" aria-label="Logo options">
            {visibleLogos.map((logo) => {
              const selected = activeLogo === logo.url;
              return (
                <button key={logo.url} type="button" role="option" aria-selected={selected}
                  disabled={pending || importing}
                  onClick={() => setSelectedLogo(logo.url)}
                  className={`relative h-20 w-20 overflow-hidden rounded-xl border-[3px] border-ink bg-white shadow-sticker focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink ${selected ? "ring-4 ring-pink" : ""}`}>
                  {/* External scrape/proxy URLs are not in next/image remotePatterns. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo.url} alt="" referrerPolicy="no-referrer" className="h-full w-full object-contain p-2"
                    onError={() => {
                      setBrokenLogos((current) => new Set(current).add(logo.url));
                      setSelectedLogo((current) => current === logo.url ? null : current);
                    }} />
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={pending || importing || !activeLogo} className={`${chipClass} bg-pink`}
              onClick={() => void applyPrefill()}>
              {importing ? "Applying…" : "Use website and logo"}
            </button>
            <button type="button" disabled={pending || importing} className={chipClass}
              onClick={() => {
                setDismissedFor(website.trim() || lookup.website);
                setLookup(null);
                setSelectedLogo(null);
              }}>
              Not now
            </button>
          </div>
        </div>
      )}

      <ImageUpload key={logoSeed.key} name="logoUrl" label="Logo" creatorId={creatorId} initialUrl={logoSeed.url} />
    </>
  );
}
